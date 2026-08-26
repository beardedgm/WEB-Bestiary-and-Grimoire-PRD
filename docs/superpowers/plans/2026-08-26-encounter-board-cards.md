# Encounter Board Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Board `encounter` card that references a saved encounter preset by id, with Send to Board from Table and Builder, roster summary, Load/Open actions, and combatant → linked `record` card.

**Architecture:** Mirror Phase 1 `record` cards. New `encounter` type in BOARD stores `{type:"encounter", presetId}` and resolves via `TRK.getPreset` at render time. Entry chips live in TRK (`renderEncPane`) and BUILD (toolbar). Combatant clicks call existing `BOARD.addRecord(ref)`.

**Tech Stack:** Vanilla JS in `app.template.html` (BOARD / TRK / BUILD IIFEs); `localStorage` `bg.board.v1` + `bg.trk.presets.v1`; build via `python3 build_bundles.py`. No automated unit test suite — verify with `node --check`, `build_bundles.py --check`, and browser smoke.

## Global Constraints

- Edit `app.template.html` only for app code — never hand-edit `index.html`; rebuild with `python3 build_bundles.py`.
- Linked means reference by id, never embed combatants or stat blocks in the card.
- Unknown/deleted `presetId` stays valid in `vCard`; render a missing notice.
- Guard cross-module calls: `window.TRK`, `window.BUILD`, `window.BOARD`.
- Do not put `encounter` on the Board add rail.
- Unsaved Builder drafts cannot pin — require `draft.editingPresetId`.
- Destructive confirms use `TRK.confirmSwap`, never `window.confirm` for Load overwrite.
- Keep docs in the same change: PRODUCT, DESIGN, CLAUDE, workflow-spec checklist, plan note.

## File map

| File | Responsibility |
|---|---|
| `app.template.html` | All behavior: BOARD card type, fill/add, CSS; Table Send chip; Builder Send chip |
| `PRODUCT.md` | Board capability + terminology |
| `DESIGN.md` | Encounter card one-liner under Board cards |
| `CLAUDE.md` | BOARD row mentions encounter cards |
| `docs/superpowers/specs/2026-08-26-connected-workflow.md` | Check off Phase 2 integration criterion |
| `docs/superpowers/plans/2026-08-26-encounter-board-cards.md` | This plan (shipped note at end) |

Spec: `docs/superpowers/specs/2026-08-26-encounter-board-cards-design.md`

---

### Task 1: BOARD — `encounter` card type, validate, render, `addEncounter`

**Files:**
- Modify: `app.template.html` (BOARD IIFE ~6007–7399; CSS near `#board .record-*` ~991)

**Interfaces:**
- Consumes: `TRK.getPreset(id)` → preset or null; `TRK.loadPreset` / `TRK.confirmSwap` / `TRK.setMode`; `BUILD.openPreset(id)`; `BOARD.addRecord(ref)`
- Produces: `BOARD.addEncounter(presetId)` → `{ ok: boolean, name?: string, error?: string }`; card field `presetId: string`

- [ ] **Step 1: Branch from current main**

```bash
git checkout main && git pull
git checkout -b cursor/encounter-board-cards
```

- [ ] **Step 2: Extend CARD_TYPES and vCard**

In BOARD, change:

```js
const CARD_TYPES = new Set(["markdown","image","audio","counter","dice","timer","checklist","random","record","encounter"]);
```

In `vCard`, after the `record` branch:

```js
} else if (type === "encounter"){
  card.presetId = vStr(raw.presetId, 64, "");
}
```

- [ ] **Step 3: Extend addCard defaults and cardHasSubstance**

In `addCard`, after the `record` default:

```js
if (type === "encounter") Object.assign(base, { title: "Encounter", presetId: "", w: 336, h: 360 });
```

In `cardHasSubstance`:

```js
case "encounter": return false;
```

In `renderCard` KIND map:

```js
encounter: "encounter"
```

In body dispatch:

```js
else if (card.type === "encounter") fillEncounter(body, card);
```

- [ ] **Step 4: Add CSS for encounter roster**

After `#board .record-missing` rules:

```css
#board .encounter-body{display:flex; flex-direction:column; gap:8px; padding:10px 12px}
#board .encounter-roster{list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:4px}
#board .encounter-roster li{
  display:flex; align-items:center; gap:8px;
  font:14px/1.35 var(--serif); color:var(--ink)}
#board .encounter-roster .etype{
  font:600 9.5px/1 var(--mono); letter-spacing:.08em; text-transform:uppercase; color:var(--faint)}
#board .encounter-roster button.eref{
  border:0; background:transparent; padding:0; font:inherit; color:var(--ink);
  text-decoration:underline; text-decoration-color:var(--gilt); text-underline-offset:2px; cursor:pointer}
#board .encounter-roster button.eref:hover{text-decoration-style:solid}
#board .encounter-roster .ename{color:var(--ink)}
#board .encounter-actions{display:flex; flex-wrap:wrap; gap:6px; margin-top:auto}
#board .encounter-missing{
  margin:0; font:italic 14px/1.5 var(--serif); color:var(--dim)}
```

- [ ] **Step 5: Implement fillEncounter + addEncounter**

Place after `addRecord`:

```js
function fillEncounter(body, card){
  body.classList.add("encounter-body");
  const preset = (window.TRK && TRK.getPreset)
    ? TRK.getPreset(card.presetId) : null;
  if (!preset){
    const miss = document.createElement("p");
    miss.className = "encounter-missing";
    miss.textContent = "Encounter not found — it may have been removed from saved encounters.";
    body.appendChild(miss);
    return;
  }
  const list = document.createElement("ul");
  list.className = "encounter-roster";
  const combatants = (preset.enc && Array.isArray(preset.enc.combatants))
    ? preset.enc.combatants : [];
  if (!combatants.length){
    const empty = document.createElement("li");
    empty.className = "ename";
    empty.style.color = "var(--dim)";
    empty.textContent = "Empty roster";
    list.appendChild(empty);
  }
  for (const c of combatants){
    const li = document.createElement("li");
    const type = document.createElement("span");
    type.className = "etype";
    type.textContent = c.type === "player" ? "pc" : (c.type === "monster" ? "mon" : "npc");
    li.appendChild(type);
    if (typeof c.ref === "string" && c.ref){
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "eref";
      btn.textContent = c.name || "—";
      btn.onclick = e => {
        e.stopPropagation();
        const res = addRecord(c.ref);
        if (typeof announceLive === "function")
          announceLive(res.ok
            ? "Added to board: " + (res.name || c.name || c.ref)
            : (res.error || "Couldn’t add to board."));
      };
      li.appendChild(btn);
    } else {
      const span = document.createElement("span");
      span.className = "ename";
      span.textContent = c.name || "—";
      li.appendChild(span);
    }
    list.appendChild(li);
  }
  body.appendChild(list);

  const acts = document.createElement("div");
  acts.className = "encounter-actions";
  const load = document.createElement("button");
  load.type = "button";
  load.className = "chip go";
  load.textContent = "Load into Tracker";
  load.onclick = e => {
    e.stopPropagation();
    if (!window.TRK || !TRK.loadPreset) return;
    const go = () => {
      TRK.loadPreset(card.presetId);
      TRK.setMode("track");
    };
    if (TRK.confirmSwap)
      TRK.confirmSwap(load, "Replace the current encounter?", go);
    else go();
  };
  const open = document.createElement("button");
  open.type = "button";
  open.className = "chip";
  open.textContent = "Open in Builder";
  open.onclick = e => {
    e.stopPropagation();
    if (window.BUILD && BUILD.openPreset) BUILD.openPreset(card.presetId);
  };
  acts.append(load, open);
  body.appendChild(acts);
}

function addEncounter(presetId){
  if (typeof presetId !== "string" || !presetId)
    return { ok: false, error: "No encounter id." };
  const b = active();
  if (b.cards.length >= MAX_BOARD_CARDS)
    return { ok: false, error: "Board is full (" + MAX_BOARD_CARDS + " cards)." };
  const preset = (window.TRK && TRK.getPreset) ? TRK.getPreset(presetId) : null;
  addCard("encounter", {
    presetId: presetId.slice(0, 64),
    title: (preset && preset.name) ? preset.name : "Encounter",
  });
  return { ok: true, name: preset ? preset.name : presetId };
}
```

Export it:

```js
return { setActive, getExport, applyUserSave, addRecord, addEncounter };
```

- [ ] **Step 6: Syntax-check BOARD script and rebuild**

```bash
python3 - <<'EOF'
import re, subprocess, tempfile, os
html = open("app.template.html").read()
scripts = re.findall(r"<script>(.*?)</script>", html, re.S)
# BOARD is typically script index 3 (0=main,1=TRK,2=BUILD,3=BOARD,4=FORGE)
for i, s in enumerate(scripts):
    path = tempfile.mktemp(suffix=".js")
    open(path,"w").write(s)
    r = subprocess.run(["node","--check",path], capture_output=True, text=True)
    os.unlink(path)
    print(f"block {i}: {'ok' if r.returncode==0 else r.stderr}")
    if r.returncode: raise SystemExit(1)
EOF
python3 build_bundles.py
```

Expected: all blocks `ok`; `index.html` written/unchanged accordingly.

- [ ] **Step 7: Commit**

```bash
git add app.template.html index.html
git commit -m "$(cat <<'EOF'
Add Board encounter card type linked to saved presets by id.

Validate presetId, render roster with missing-preset notice, and expose
BOARD.addEncounter for Table/Builder chips.
EOF
)"
```

---

### Task 2: Table — Send to Board on preset pane

**Files:**
- Modify: `app.template.html` — `renderEncPane` (~4357–4378)

**Interfaces:**
- Consumes: `BOARD.addEncounter(presetId)` → `{ ok, name?, error? }`; `announceLive(msg)`
- Produces: Send to Board chip in Table encounter reading pane

- [ ] **Step 1: Add chip markup and handler in renderEncPane**

Replace the btns block and handlers so they include Send to Board:

```js
function renderEncPane(p){
  const names = p.enc.combatants.map(c => c.name).join(" · ") || "Empty roster";
  fillPane(`<div class="sb" style="max-width:420px"><h2><span>${esc(p.name)}</span>
    <span class="rank">${esc(p.enc.combatants.length)}</span></h2><div class="rule"></div>
    <p style="margin:0;color:var(--dim)">${esc(names)}</p>
    <div class="btns" style="margin-top:14px">
      <button type="button" class="chip go" data-sload-pane="${esc(p.id)}">Load</button>
      <button type="button" class="chip" data-sbuild-pane="${esc(p.id)}">Open in Builder</button>
      <button type="button" class="chip" data-sboard-pane="${esc(p.id)}">Send to Board</button>
    </div></div>`, "");
  const sheet = $("#pane-sheet");
  const loadBtn = sheet.querySelector("[data-sload-pane]");
  if (loadBtn) loadBtn.onclick = () => {
    confirmSwap(loadBtn, "Replace the current encounter?", () => {
      loadPreset(p.id);
      if (state.ui.mode !== "track") setMode("track");
    });
  };
  const buildBtn = sheet.querySelector("[data-sbuild-pane]");
  if (buildBtn) buildBtn.onclick = () => {
    if (window.BUILD) BUILD.openPreset(p.id);
  };
  const boardBtn = sheet.querySelector("[data-sboard-pane]");
  if (boardBtn) boardBtn.onclick = () => {
    if (!window.BOARD || !BOARD.addEncounter){
      announceLive("Board unavailable.");
      return;
    }
    const res = BOARD.addEncounter(p.id);
    announceLive(res.ok
      ? "Added to board: " + (res.name || p.name)
      : (res.error || "Couldn’t add to board."));
  };
}
```

- [ ] **Step 2: Rebuild and commit**

```bash
python3 build_bundles.py
git add app.template.html index.html
git commit -m "$(cat <<'EOF'
Add Send to Board for saved encounters on the Table pane.

Pins a linked encounter card without leaving Library/Table mode.
EOF
)"
```

---

### Task 3: Builder — Send to Board when editing a saved preset

**Files:**
- Modify: `app.template.html` — Builder toolbar markup (~1370–1374); BUILD IIFE save/load/bind/renderControls (~5768–5845)

**Interfaces:**
- Consumes: `draft.editingPresetId`; `BOARD.addEncounter`
- Produces: `#buildBoard` chip; enabled iff `draft.editingPresetId` is a non-empty string

- [ ] **Step 1: Add toolbar button in HTML**

Next to `#buildLoad`:

```html
<button type="button" class="chip" id="buildBoard" disabled title="Save to Encounters first">Send to Board</button>
```

- [ ] **Step 2: Wire enable/disable + click**

Add helper inside BUILD (near `saveToEncounters`):

```js
function syncBoardChip(){
  const btn = document.getElementById("buildBoard");
  if (!btn) return;
  const can = !!(draft.editingPresetId);
  btn.disabled = !can;
  btn.title = can ? "Pin this saved encounter to the Board" : "Save to Encounters first";
}
```

Call `syncBoardChip()` at the end of `render()` (or `renderControls()` if that is the chrome refresh path), and after successful `saveToEncounters` (`draft.editingPresetId = out.id`).

Bind once near save/load:

```js
const boardBtn = document.getElementById("buildBoard");
if (boardBtn) boardBtn.onclick = () => {
  if (!draft.editingPresetId){
    status("Save to Encounters first.", true);
    return;
  }
  if (!window.BOARD || !BOARD.addEncounter){
    status("Board unavailable.", true);
    return;
  }
  const res = BOARD.addEncounter(draft.editingPresetId);
  if (res.ok) toast("Added to board: " + (res.name || draft.name || "Encounter"));
  else status(res.error || "Couldn’t add to board.", true);
};
```

Also call `syncBoardChip()` from `setActive(true)` / `openPreset` / `hydrateFromBuilderMeta` / `hydrateFromEnc` paths that change `editingPresetId` (wherever `render()` already runs is enough if sync is inside `render`).

- [ ] **Step 3: Rebuild, syntax-check, commit**

```bash
python3 build_bundles.py
# node --check all script blocks as in Task 1 Step 6
git add app.template.html index.html
git commit -m "$(cat <<'EOF'
Add Builder Send to Board for drafts tied to a saved preset.

Chip stays disabled until Save to Encounters sets editingPresetId.
EOF
)"
```

---

### Task 4: Docs + browser smoke + ship note

**Files:**
- Modify: `PRODUCT.md`, `DESIGN.md`, `CLAUDE.md`, `docs/superpowers/specs/2026-08-26-connected-workflow.md`
- Create/update: `docs/superpowers/plans/2026-08-26-encounter-board-cards.md` (this file — add Shipped blurb when done)

- [ ] **Step 1: Update PRODUCT.md**

In the Board capability bullet, after record cards, add encounter cards:

```
and linked encounter cards (a saved Encounter preset referenced by id — roster summary,
Load into Tracker / Open in Builder, combatant names spawn record cards; "Send to Board"
from Table and from Builder when the draft is saved)
```

- [ ] **Step 2: Update DESIGN.md Board cards section**

Add: `Encounter cards list the linked preset’s roster on paper stock with chip actions in the footer; missing presets use the same italic dim notice pattern as missing record refs.`

- [ ] **Step 3: Update CLAUDE.md BOARD row**

```
| `BOARD` | Session boards: … / record / encounter cards (`BOARD.addRecord` / `BOARD.addEncounter`; Send to Board from Library, Table, Builder) |
```

- [ ] **Step 4: Update connected-workflow integration checklist**

Mark:

```
- [x] An encounter (Builder draft or Tracker state) can appear on the Board as a linked
      card — *Phase 2 (saved preset; live Tracker mirroring deferred)*
```

(Keep wording honest: Phase 2 ships **saved preset** cards, not live Tracker state.)

- [ ] **Step 5: Browser smoke** (serve `python3 -m http.server 8000 --bind 127.0.0.1` → `http://127.0.0.1:8000/index.html`)

Checklist:

1. Table → Encounters → open a preset → Send to Board → switch to Board → roster card visible.
2. Builder → open same preset (or Save new) → Send to Board enabled → pin again (duplicate OK).
3. Builder with fresh unsaved draft → chip disabled / “Save to Encounters first.”
4. Click a monster name on the card → record card appears; click a dice formula → popup rolls.
5. Load into Tracker from card (confirm if needed) → Tracker mode with that roster.
6. Open in Builder from card → Builder opens that preset.
7. Reload → encounter card persists.
8. Corrupt `presetId` in `bg.board.v1` → missing-encounter notice; other cards fine.
9. Portable export/import of boards keeps `{type:"encounter", presetId}` without embedded combatants.

Console helper for step 9:

```js
const exp = BOARD.getExport();
const card = exp.boards.flatMap(b => b.cards).find(c => c.type === "encounter");
// expect: card.presetId string, no card.enc / card.combatants
```

- [ ] **Step 6: Final build check and commit**

```bash
python3 build_bundles.py --check
git add PRODUCT.md DESIGN.md CLAUDE.md \
  docs/superpowers/specs/2026-08-26-connected-workflow.md \
  docs/superpowers/plans/2026-08-26-encounter-board-cards.md \
  app.template.html index.html
git commit -m "$(cat <<'EOF'
Document encounter Board cards and mark Phase 2 integration shipped.

PRODUCT/DESIGN/CLAUDE plus workflow-spec checklist for linked preset cards.
EOF
)"
```

- [ ] **Step 7: Push and open PR**

```bash
git push -u origin cursor/encounter-board-cards
gh pr create --title "Add linked encounter Board cards (connected workflow, Phase 2)" --body "$(cat <<'EOF'
## Summary
- New Board `encounter` card type referencing a saved preset by `presetId` (roster live from `TRK.getPreset`; missing preset → honest notice)
- Send to Board from Table encounter pane and Builder (enabled only when `editingPresetId` is set)
- Card actions: Load into Tracker, Open in Builder; combatant with Library `ref` spawns a `record` card

## Test plan
- [x] `build_bundles.py --check`; script `node --check`
- [ ] Table + Builder pin paths; disabled Builder chip when unsaved
- [ ] Roster → record card + dice roll; Load / Open Builder
- [ ] Reload + missing presetId + portable save shape
EOF
)"
```

---

## Spec coverage self-review

| Spec requirement | Task |
|---|---|
| `encounter` type + `presetId` validation / missing notice | Task 1 |
| `BOARD.addEncounter` | Task 1 |
| Not on add rail; `cardHasSubstance` false | Task 1 |
| Table Send to Board | Task 2 |
| Builder Send (saved only) | Task 3 |
| Roster + Load + Open Builder + spawn record | Task 1 |
| Portable / reload / docs / acceptance | Task 4 |
| Non-goals (live Tracker, draft pin, DnD, edit roster) | Out of plan |

No TBD placeholders. Names consistent: `presetId`, `addEncounter`, `fillEncounter`, `editingPresetId`.

---

## Shipped

Landed on `cursor/encounter-board-cards`. All four tasks complete:

- `BOARD.addEncounter` + `encounter` card type, roster render, missing-preset notice
  (Task 1).
- Table Send to Board on the encounter reading pane (Task 2).
- Builder Send to Board, gated on `draft.editingPresetId` (Task 3).
- Docs (`PRODUCT.md`, `DESIGN.md`, `CLAUDE.md`, connected-workflow checklist) and full
  browser smoke, this task.

Browser smoke ran headless via Puppeteer against the built `index.html` (the
`cursor-ide-browser` MCP tool had no reachable browser tab in this environment, so a local
Chrome + Puppeteer script drove the same real DOM click paths instead — including the actual
Table `#sg-table` → `#st-enc` → preset row → `data-sboard-pane` click chain, not just the
underlying API). All 9 checklist scenarios passed: Table Send to Board via the real UI click
chain, Builder Send (enabled on a saved preset, disabled on a fresh draft, re-pin OK), roster
combatant click spawning a record card with working dice popup, Load into Tracker and Open in
Builder from the card, persistence across reload, an honest missing-encounter notice after
corrupting `presetId`, and a portable export containing only `{type, presetId}` with no
embedded combatants. No console errors observed. `build_bundles.py --check` is clean.

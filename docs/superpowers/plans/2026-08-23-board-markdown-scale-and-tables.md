# Board Markdown: Large Notes + Tables Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Status:** Shipped on `main` as of 2026-08-29. Implementation steps below are archival; see PRODUCT.md / specs for current behavior.


**Status:** **Shipped** on `main` (v1). GFM tables, debounced save, preview cache, expand overlay, and size caps live in the `BOARD` IIFE (`app.template.html`). Unchecked steps below are archival; run [`2026-08-28-plan-doc-housekeeping.md`](2026-08-28-plan-doc-housekeeping.md) to mark them `[x]`.

**Goal:** Make Board markdown cards handle large session notes (~60k+ characters) without jank, and render GitHub-flavored pipe tables.

**Architecture:** Hand-rolled `md()` in the `BOARD` IIFE (no CDN). Follow-up storage work (IndexedDB bodies, zip export) is **not** part of v1 — see [`2026-08-28-board-lore-storage.md`](2026-08-28-board-lore-storage.md).

**Tech Stack:** Vanilla HTML/CSS/JS in `app.template.html`. No new dependencies.

## Global Constraints

- **Main app:** Edit `app.template.html` only; rebuild `index.html` via `build_bundles.py`.
- **No CDN / no npm markdown libs.**
- **Card types:** image, audio, counter, dice, timer, checklist, random (+ markdown). Persist under `bg.board.v1`.
- **Blockquotes = read-aloud text** (olive).
- **Tables are display + authoring in source markdown**, not a visual table editor.

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `docs/mockups/board-mode.html` | Board sample UI + `md()` + markdown card UX | Modify — all tasks |
| `docs/superpowers/plans/2026-08-23-board-markdown-scale-and-tables.md` | This plan | Reference only |

---

### Task 0: Counter rename + read-aloud blockquotes *(product polish; do first if not already done)*

**Files:**
- Modify: `docs/mockups/board-mode.html`

**Done when:**
- Rail / empty copy / seeds say **Counter**, not Clock; `type: "counter"`; CSS `.counter`; `fillCounter`; STORE `bg.board.sample.v3`
- `.md-view blockquote` uses olive border + olive text (read-aloud cue)
- Seed note includes a `>` line that demos spoken text

- [x] Rename Clock → Counter (UI + data + CSS)
- [x] Olive read-aloud blockquotes
- [x] Bump store key to `v3` so seeds refresh

---

### Task 1: GFM pipe tables in `md()`

**Files:**
- Modify: `docs/mockups/board-mode.html` (`md()` / `function md`, and `.md-view` CSS)

**Interfaces:**
- Consumes: existing `md(src) → html string`, `esc(s)`
- Produces: `md()` also emits `<table>…</table>` for pipe tables; CSS for `.md-view table`

**Spec (supported table syntax):**

```markdown
| NPC | Role | DC |
| --- | --- | ---: |
| Vessa | Fence | 14 |
| Orrin | Watch | 12 |
```

Rules:
- A table is a run of lines starting with `|`.
- Second line must be a separator: cells matching `^\s*:?-+:?\s*$` (optional left/right alignment colons).
- Header row + separator required; body rows optional.
- Alignment: `:---` left, `:---:` center, `---:` right (default left).
- Inline markdown (`**bold**`, `` `code` ``, `*em*`) still runs inside cells via existing `inline()`.
- Lines that look like tables but fail the separator rule stay paragraphs (no silent corruption).

- [x] **Step 1: Add table CSS under `.md-view`**

```css
.md-view table{
  width:100%; border-collapse:collapse; margin:0 0 .7em;
  font:13px/1.4 var(--sans);
}
.md-view th,.md-view td{
  border:1px solid var(--hair); padding:6px 8px; vertical-align:top;
  text-align:left;
}
.md-view th{background:var(--stone-2); font-weight:600}
.md-view td.num,.md-view th.num{text-align:right; font-variant-numeric:tabular-nums}
.md-view td.ctr,.md-view th.ctr{text-align:center}
```

- [x] **Step 2: Add helpers inside the IIFE (next to `md`)**

```js
function splitPipeRow(line){
  let s = String(line).trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map(c => c.trim());
}
function isSepRow(cells){
  return cells.length > 0 && cells.every(c => /^:?-+:?$/.test(c));
}
function alignClass(spec){
  const left = spec.startsWith(":");
  const right = spec.endsWith(":");
  if (left && right) return "ctr";
  if (right) return "num";
  return "";
}
```

- [x] **Step 3: In `md()` loop, detect table starts**

When `raw.trim().startsWith("|")`, peek ahead: parse current as header cells; next non-empty line must be separator. If not, fall through to paragraph. If yes, consume consecutive `|` rows into one `<table>`.

```js
// Pseudocode inside the for-loop:
if (raw.trim().startsWith("|")){
  const header = splitPipeRow(raw);
  const next = lines[i + 1]; // use index-based loop
  if (next && isSepRow(splitPipeRow(next))){
    closeLists();
    const aligns = splitPipeRow(next).map(alignClass);
    i += 2;
    let bodyRows = [];
    while (i < lines.length && lines[i].trim().startsWith("|")){
      if (isSepRow(splitPipeRow(lines[i]))) { i++; continue; }
      bodyRows.push(splitPipeRow(lines[i]));
      i++;
    }
    i--; // for-loop will advance
    // build <table><thead>…</thead><tbody>…</tbody></table>
    // pad/truncate cells to header.length
    continue;
  }
}
```

Convert the `for (const raw of lines)` loop to `for (let i = 0; i < lines.length; i++)` so peeking works.

- [x] **Step 4: Seed a small table in “NPC — Vessa” or a new note**

Append to an existing markdown body:

```markdown
| Lead | Detail |
| --- | --- |
| Password | `red-lantern` |
| Tell | taps twice |
```

Bump store key to `bg.board.sample.v3` **or** document “clear site data / use New board” so testers see the seed.

- [x] **Step 5: Browser verify**

Serve mockups (`python -m http.server 8781` from repo root if needed). Open `docs/mockups/board-mode.html`. Confirm table borders, header background, right-aligned numeric column if present. Edit mode still shows raw pipes; preview shows table.

- [x] **Step 6: Commit** (only if user asked)

```bash
git add docs/mockups/board-mode.html
git commit -m "feat(mockup): render GFM pipe tables in board markdown"
```

---

### Task 2: Stop full-board re-render on every keystroke

**Files:**
- Modify: `docs/mockups/board-mode.html` (`fillMarkdown`, `touch` / save path)

**Interfaces:**
- Consumes: `card.body`, `card.editing`
- Produces: typing updates `card.body` + debounced save; preview HTML updates only when leaving edit or after debounce if live-preview mode exists

**Problem today:** `ta.oninput` → `touch()` → `save()` is OK, but any path that calls `render()` while typing rebuilds every card and re-runs `md()` on all notes.

- [x] **Step 1: Make edit `input` local**

```js
ta.oninput = () => {
  card.body = ta.value;
  card._previewDirty = true;
  scheduleBoardSave(); // debounced localStorage write only — does NOT call render()
};
```

- [x] **Step 2: Add `scheduleBoardSave`**

```js
let saveTimer = null;
function scheduleBoardSave(){
  active().updatedAt = Date.now();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { save(); }, 400);
}
```

Keep immediate `touch()` / `save()` for structural changes (add/remove card, drag end, collapse).

- [x] **Step 3: Cache preview HTML**

```js
function markdownHtml(card){
  if (!card._previewDirty && card._previewHtml != null && card._previewFor === card.body){
    return card._previewHtml;
  }
  card._previewHtml = md(card.body);
  card._previewFor = card.body;
  card._previewDirty = false;
  return card._previewHtml;
}
```

In preview branch of `fillMarkdown`, use `markdownHtml(card)` instead of `md(card.body)`.

When toggling edit→preview, clear dirty and refresh that card only if easy; otherwise `render()` once is fine.

- [x] **Step 4: Verify with a large paste**

Paste ~60k characters of filler markdown into a note (generate in console):

```js
// In page console:
const big = "# Load\n\n" + Array.from({length: 3000}, (_,i) => `- Item ${i} with **bold** and a longer sentence for density.`).join("\n");
console.log(big.length);
```

Paste into edit mode. Confirm: typing remains responsive; other cards do not flicker; after debounce, reload page and body persists.

- [x] **Step 5: Commit** (if requested)

```bash
git commit -m "perf(mockup): debounce board saves and cache markdown preview"
```

---

### Task 3: Large-note UX (size meter, expand editor, auto-collapse hint)

**Files:**
- Modify: `docs/mockups/board-mode.html` (markdown card chrome + overlay)

**Interfaces:**
- Consumes: `card.body.length`
- Produces: size chip; optional `#mdExpand` overlay for comfortable editing

**Thresholds (mockup constants):**

```js
const MD_SOFT = 20000;  // show “Large note” chip
const MD_WARN = 60000;  // stronger warning + suggest Expand
const MD_HARD = 120000; // toast on paste/save: still allowed, warn about storage
```

- [x] **Step 1: Size chip in markdown card body header row (inside `.body` top)**

When not collapsed, show mono chip: `12.4k` / `Large · 61k`. Use existing `.lbl` / faint styles — no new colors.

- [x] **Step 2: Expand editor overlay**

Markup (once in HTML shell):

```html
<div id="mdExpand" class="md-expand" hidden>
  <div class="md-expand-panel" role="dialog" aria-modal="true" aria-label="Expanded note editor">
    <header>
      <input id="mdExpandTitle" aria-label="Note title" />
      <button type="button" id="mdExpandPreview">Preview</button>
      <button type="button" id="mdExpandClose">Done</button>
    </header>
    <textarea id="mdExpandBody"></textarea>
    <div id="mdExpandView" class="md-view" hidden></div>
  </div>
</div>
```

CSS: fixed full-viewport scrim; panel max-width ~900px; textarea fills remaining height; use stone/vellum tokens.

- [x] **Step 3: Wire expand**

Button on markdown cards: **Expand**. Opens overlay bound to that `card`. `Done` writes title/body back, `scheduleBoardSave()`, closes, `render()`. Escape closes like Done (save). Preview toggle reuses `md()` / `markdownHtml`.

- [x] **Step 4: Soft behavior for huge notes on the board**

If `card.body.length >= MD_WARN` and card is not collapsed when first added/loaded this session, do **not** force-collapse (surprising). Instead show chip + Expand affordance. Optional: default **new** notes stay small; import/paste over WARN toasts once: “Large note — use Expand for comfortable editing.”

- [x] **Step 5: Browser verify**

- 5k note: no warning chip (or only char count).
- 25k: “Large” chip.
- 60k: warn chip + Expand works; preview tables still render in overlay.
- Collapse still hides body; Expand available from header even when collapsed (add Expand next to fold if collapsed).

- [x] **Step 6: Commit** (if requested)

```bash
git commit -m "feat(mockup): expand editor and size warnings for large board notes"
```

---

### Task 4: Storage policy for many large notes (mockup-documented)

**Files:**
- Modify: `docs/mockups/board-mode.html` (save error path + foot note)
- No IndexedDB in this plan (zip/asset store is a separate track)

**Policy to implement/document in the mockup foot / toast:**

| Content | Where |
|---|---|
| Markdown text (including 60–120k notes) | Board JSON in `localStorage` |
| Images / audio blobs | Prefer not to grow further in LS; current sample may still use data-URLs — do not change in this plan |
| Save failure | Existing toast; add “Note too large for browser storage — remove a large note or image” when `QuotaExceededError` |

- [x] **Step 1: Detect quota errors explicitly**

```js
function save(){
  try{ localStorage.setItem(STORE, JSON.stringify(state)); }
  catch(err){
    const quota = err && (err.name === "QuotaExceededError" || err.code === 22);
    toast(quota
      ? "Storage full — shrink large notes or remove media cards"
      : "Could not save to localStorage");
  }
}
```

- [x] **Step 2: One-line foot copy**

Update rail foot to mention: text notes persist in the browser; very large notes + media can hit quota (zip pack later).

- [x] **Step 3: Verify** by temporarily setting a tiny note in DevTools Application → forcing save is optional; at least confirm catch path with a stubbed `setItem` throw in console if easy.

- [x] **Step 4: Commit** (if requested)

```bash
git commit -m "fix(mockup): clearer quota handling for large board notes"
```

---

### Task 5: Manual acceptance checklist (mockup)

Do not mark the feature done until all pass on desktop Chrome (and spot-check Firefox):

- [x] Pipe table with alignment renders correctly in card preview and Expand preview
- [x] Broken “fake table” without separator stays text
- [x] 60k-character note: edit without UI freeze; reload restores body
- [x] Typing in one note does not flash-rebuild unrelated cards
- [x] Expand / Done / Escape round-trip preserves body and title
- [x] Collapse + Expand still work together
- [x] Audio / counter / dice / image cards still work after markdown changes
- [x] Blockquotes render in olive (read-aloud cue)

---

## Out of scope (follow-up plans)

- ~~Wiring Board into `app.template.html`~~ — **shipped** (v1)
- Zip export with assets → [`2026-08-28-board-lore-storage.md`](2026-08-28-board-lore-storage.md) Track B
- IndexedDB for markdown bodies → [`2026-08-28-board-lore-storage.md`](2026-08-28-board-lore-storage.md) Track A
- WYSIWYG table editor
- Full CommonMark / markdown-it feature parity (task lists, footnotes, etc.)

## Suggested implementation order

1 → 2 → 3 → 4 → 5  

Tables first (visible win), then performance (makes 60k usable), then UX chrome, then storage messaging.

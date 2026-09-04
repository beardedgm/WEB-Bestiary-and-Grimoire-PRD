# Connected improvements roadmap — 2026-09-03

**Status:** Specs stubbed (revised after second code review). **P1, P2, P3, P4, P5, P6, P7 and
P8 shipped**; P2b not started. Ship phases as separate PRs.

**Amended 2026-09-03:** P3, P7 and P8 specs revised after a plan review against the code.
Each named a helper or API that does not exist in the shape the spec assumed; the required
work is now scoped in the spec rather than left to be discovered mid-implementation. P2's
Problem statement was also amended after a code review found two live defects in the Save
dialog it described as already shipped (fixed separately; P2 scope unchanged).

Extends the connected workflow ([`2026-08-26-connected-workflow.md`](../specs/2026-08-26-connected-workflow.md)).
Replaces ad-hoc post-Maps improvement mode with a sequenced program: **one campaign, many
verbs on the same objects**. Competitors inform metrics and one lesson each — not feature
parity.

Parent backlog pointer: [`2026-08-28-backlog-roadmap.md`](2026-08-28-backlog-roadmap.md).

---

## Principles (bind all phases)

1. Prefer **bridges** over deeper single-mode chrome.
2. Respect ownership: Lore = adventure text; Board = tonight; Tracker = live combat;
   Maps blobs = separate export.
3. Closed non-goals stay closed: Board/Tracker → Lore **automation**, Maps as VTT, cloud
   sync, CR↔level conversion.
4. **Explicit** Board markdown → Lore **copy** (P8) is allowed; auto-capture is not.
   Framing is “Copy to Lore…,” not archive/promote of tonight’s session.
5. Drag/drop is **out** until after P1 ships and is verified.
6. Operate / Game Table visual constraints hold — no Beyond-dense list rows.
7. Normalize **discoverability and action policy**, not application ownership — modules keep
   owning operations via guarded public APIs (`window.TRK`, `BUILD`, `BOARD`, `LORE`, …).

## Locked interaction defaults

| Decision | Choice |
|----------|--------|
| Primary UI | Contextual primary chip + secondary actions in a consistent overflow (`⋯`) or same chip row when ≤2 actions |
| Verb vocabulary | `Open` · `Board` · `Builder` · `Tracker` · `Maps` · `Copy` (P8 only: “Copy to Lore…”) |
| Action layer | Thin `actionsFor(subject, context)` → UI descriptors; no event bus, DI, or giant dispatcher |
| Save archive | Map/media stay out of `bg-user-save/1`; full campaign zip is **P2b**, not stuffing the 8 MB JSON |

## Object → verb matrix (P1 target)

| Object | Open | Board | Builder | Tracker | Maps | Copy |
|--------|------|-------|---------|---------|------|------|
| Monster / custom | yes | Send | Add (when build) | Add (when track / qty) | — (P6 links map-side) | — |
| Spell | yes | Send | — | — | — | — |
| Encounter preset | Open/Load | Send | Open in Builder | Load | — | — |
| Lore page | yes | Pin | — | — | — | — |
| Board markdown | Expand | — | — | — | — | **Copy to Lore…** (shipped) |
| Map | Open Maps | — | — | — | — | — |

Context picks **one** primary (e.g. in Builder, monster primary = Builder).

---

## Phase table

| Phase | Name | Metric | Spec | Depends on |
|-------|------|--------|------|------------|
| **P1** | Action consistency | Time from “I need this creature” to it landing in Builder / Tracker / Board | [`2026-09-03-object-action-matrix.md`](../specs/2026-09-03-object-action-matrix.md) | — |
| **P2** | Save finishing polish | GM sees when they last downloaded a portable save (not proof the file still exists) | [`2026-09-03-save-trust.md`](../specs/2026-09-03-save-trust.md) | Scope copy already shipped |
| **P2b** | Campaign archive zip | Recovery story for map/media blobs | same spec (Track B) | P2 |
| **P3** | Builder remaining → Library fit | Time to answer “what if I add one more?” | [`2026-09-03-builder-library-fit.md`](../specs/2026-09-03-builder-library-fit.md) | P1 recommended |
| **P4** | Recent combat events | Look away 30s, look back, know round / current / next / HP / markers + what just happened | [`2026-09-03-tracker-glance.md`](../specs/2026-09-03-tracker-glance.md) | — |
| **P5** | Resume Board | After two weeks, “where was I?” without a dashboard | [`2026-09-03-campaign-resume.md`](../specs/2026-09-03-campaign-resume.md) | `bg.board.lastOpen.v1` (shipped) |
| **P7** | Forge roles / band-first UI | Time from “level-8 undead brute” to usable block | [`2026-09-03-forge-roles.md`](../specs/2026-09-03-forge-roles.md) | — |
| **P6** | Maps linked tokens | Fewer tool changes during exploration | [`2026-09-03-maps-linked-tokens.md`](../specs/2026-09-03-maps-linked-tokens.md) | P1 recommended; **intentional scope expansion** |
| **P8** | Copy Board note to Lore | Session note can become adventure text without breaking ownership | [`2026-09-03-board-promote-to-lore.md`](../specs/2026-09-03-board-promote-to-lore.md) | Board + Lore stable |

### Suggested ship order

**P1 → P2 → P3 → P4 → P5 → P7 → P6 → P8** (P2b when archive format is fully specified).

P7 ships before P6: Forge improves an existing core workflow; linked map tokens reopen a
documented Maps non-goal and add coupling.

Each phase: design spec sign-off → implement → browser verify against its metric → PR.

---

## Phase summaries

### P1 — Action consistency

Thin `actionsFor(subject, context)` returns UI/action descriptors (label, primary flag,
handler reference). A small render helper paints primary chip + overflow. **Operations stay
owned** by `TRK` / `BUILD` / `BOARD` / `LORE` (fold discoverability of `addSendToBoard`,
Table Load/Open/Send, Builder Load, Lore Pin — not ownership). Same labels everywhere.
No drag. No bus / DI / dispatcher.

**Primary files:** `app.template.html` (Script 1 + call sites).

### P2 — Save finishing polish (shipped)

Honest scope copy is already shipped (JSON vs Maps Export vs Board zip; import encounter
warning; partial persistence honesty). Remaining work:

- Persist timestamp on successful Download; show **“Last downloaded save: …”** or
  **“Last portable export: …”** (never “backup” — a timestamp does not prove the file exists).
  Shipped as `bg.userSave.meta.v1` (`lastPortableExportAt`, validated by `vUserSaveMeta`),
  stamped only after the blob reaches the browser and shown in the Save dialog.
- Brief Maps-images-exported-separately reminder if useful. Already carried by the shipped
  scope copy; not duplicated.

**P2b (later):** Full campaign archive (JSON + map/media blobs)—new format; do not enlarge
`bg-user-save/1` past 8 MB.

**Primary files:** `app.template.html` (`openUserSaveDialog`, `downloadUserSave`).

### P3 — Builder remaining → Library fit (shipped)

When `body.build`, Library chip **Fits remaining** calls `BUILD.fits(ref)`:
simulate draft + one candidate → run **existing** Builder spend math → `spent <= budget`.
Never independent Library XP ≤ remaining arithmetic (breaks 2014 multipliers; mis-fits
PF2e outside-±4 at 0 XP).

Two constraints now locked in the spec: `spendSummary()` takes no arguments and reads the
module-scoped `draft`, so P3 first gives it an explicit state parameter (simulating by
mutating and restoring the live draft is out); and because `refresh()` filters all 9,339
records per keystroke, the per-refresh half of the math must be hoisted out of the
per-candidate loop.

Shipped: `budgetFor` / `lineCost` / `spendSummary` take an optional state defaulting to the
live draft; `BUILD.fitContext()` does the roster walk once and its `fits(ref)` runs one
`lineCost` through the shared `spendOf` multiplier. The chip lives in `#f-fit` and clears
itself on leaving Builder.

**Primary files:** `app.template.html` (BUILD + Library filters).

### P4 — Recent combat events (shipped)

Stronger current/next hierarchy. Tiny event strip from **semantic** metadata passed into
`mutate(fn, meta)` (e.g. damage amount/target) — **not** undo-snapshot diffs.
**In-memory** 10–20 event ring (table-speed awareness); does not survive refresh; not a
combat log / export surface. No rules automation.

Shipped: `mutate(fn, meta)` takes an optional descriptor — an object, or a function of the
already-healed encounter when the line needs the outcome (`applyHP` needs the resulting HP,
the turn steps need the combatant who ended up holding the turn). A module-scoped 14-entry
`events` ring stores `{ id, kind, text }`; `start` / `reset` / `clear` / `load` replace it
because the roster their lines described is gone, and `applyUserSave` empties it beside the
undo ring. Unknown kinds are dropped rather than rendered blank. `#trkglance` sits between
`#trkbar` and `#trklist` with a Now / Next line and the ring, `aria-hidden` because
`#trklive` already speaks every line. Cards gained `Now` / `Next` mono badges plus a fatter
spine and heavier name on the active card; `nextIdOf` runs the same walk as `nextTurn`, so
the badge cannot promise an order the Next chip will not follow.

**Primary files:** `app.template.html` (TRK).

### P5 — Resume Board (shipped)

Header/campaign picker: **Continue Board: {title}** from existing `bg.board.lastOpen.v1`.
v1 does not pick “most recent surface” across Board vs Maps. Not a Campaign mode.

Shipped: BOARD went from two private helpers around `LAST_KEY` to a two-call public API —
`BOARD.lastOpen()` returns `{ id, title }` for the active campaign or `null`, and
`BOARD.openBoard(id)` switches to that board (entering Board mode only when the module is
not already active). `lastOpen()` also clears a pointer that no longer resolves, which is
what makes the deleted-board case degrade to no cue rather than a dead chip; `forgetLast`
now backs both it and `dropCampaignBoards`. `CAMPAIGN.renderResumeCue()` owns the
`#hdrResume` chip and runs from `renderHeader` (so every campaign create / switch / rename /
delete refreshes it) and from BOARD's `rememberLast` / board rename. No cold-load auto-open.

**Primary files:** `app.template.html` (CAMPAIGN header + BOARD last-open).

### P7 — Forge roles / band-first UI (shipped)

Role presets as Extreme/High/Moderate/Low distributions across defenses/offense; intent
chips primary, numbers secondary; 5e translated carefully (no fake PF2e identity). Ships
before P6.

Carried a hard rule: the PF2e branch fabricated `abilityMods` (five zeros plus a `wisGuess`
derived from Perception) on records whose own `parse.warnings` say ability scores are
unstated. That broke the "never compute a value the source didn't state" invariant, and the
schema already allowed `null`. P7 fixed it — the 5e branch is honest and stayed as is.

Shipped: seven role chips (Balanced / Brute / Soldier / Skirmisher / Sniper / Caster / Mook)
own a band distribution over HP, AC, saves, Perception, attack, damage and spell DC. Bands
are rungs relative to the system's benchmark row, which is the **Moderate** rung, so
Balanced reproduces the pre-P7 output exactly. Under the chips a strip of per-stat band
buttons cycles Extreme → High → Moderate → Low; deviating from a role's distribution drops
the chip and reads "Custom mix". The PF2e **Damage band** `<select>` is gone — the strip owns
that value, mapping the row's older Low/Moderate/Severe/Extreme columns onto the four rungs
with Severe as High. 5e translates to HP inside the CR row's own stated `hpMin`…`hpMax`
range, AC / attack offsets, a damage rescale that moves only the flat bonus, and a
role-driven primary/secondary ability pair; `challenge.kind` stays `cr` and no CR ↔ level
math was added. PF2e records now emit `abilityMods: null`, and
`validateCustomRecord` accepts null (a *partly* filled object is still an error) so Save to
Custom lands them.

**Primary files:** `app.template.html` (FORGE + `validateCustomRecord`).

### P6 — Maps linked tokens (intentional scope expansion, shipped)

**Decision:** Reopen Library-linked Maps tokens because the connected-object model now
makes the benefit worth the coupling. Previously an explicit non-goal in Maps backlog /
token-grid specs — Track E in
[`2026-08-28-maps-phase3-deferred.md`](2026-08-28-maps-phase3-deferred.md). That non-goal is
**intentionally reopened**, and the backlog, token/grid spec and Maps phase 2 plan were
updated in the same change so nothing in the repo still calls it deferred.

Optional `ref` on token (Library id) — not copied monster state. Open record / Send to
Tracker / locate combatant as needed for spatial adjudication. Not VTT.

Shipped: `vToken` validates `ref` as an id string or `null` and resolves it lazily, so an
imported map naming an absent record degrades to "not in this library" instead of a broken
token, and unlinked tokens are byte-identical to before. Script 1 grew the three calls a
surface holding only an id needs — `recordRef`, `searchRecordRefs`, `openRecordById` (which
leaves Maps for Browse, since Board / Forge / Lore / Maps each replace `<main>`) — and `TRK`
grew `addByRef` plus a read-only `combatantsByRef`; `addFromView` was refactored onto the
same `addFromRecord` so the HP-less PF2e branch still opens the add form. `actionsFor`'s
`record` branch now yields **Open** and **Tracker** away from the Library surface, and the
token editor paints them with `mountActionChips`, so Maps invents no verbs. Pinning
Library → Maps was **not** shipped: the link is made map-side, which keeps the Library
ignorant of which map is open.

**Primary files:** `maps/maps-app.js`, `app.template.html` (MAPS bridges).

### P8 — Copy Board note to Lore

User-initiated **Copy to Lore…** on Board markdown: hydrate IDB body if needed → new Lore
page under active campaign → choose parent chapter → copy title + markdown. Board original
stays; no sync afterward. Uses a real `LORE` creation API (Board does not mutate Lore
internals). **Not** auto capture; **not** “Promote” / session archive into Lore.

That API did not exist — `LORE` exposed no page creation, and the internal `newPage`
focuses the title field, so Board could not call it. P8 added a headless `LORE.createPage`
returning a `BOARD.addRecord`-style result object, and refactored `newPage` onto it.

**Primary files:** `app.template.html` (BOARD + LORE / CAMPAIGN lore pages).

**As shipped.** `LORE.createPage(campaignId, { title, body, parentId, tags })` and
`LORE.listPages(campaignId)` (flat, ordered, copied `{ id, title, depth }` for the parent
picker) are the only two things Board touches. The chip comes from a new
`board-markdown` subject in `actionsFor`, spending the `Copy` verb the P1 matrix reserved;
the picker swaps into the chip like `TRK.confirmSwap`, so the parent choice and the confirm
are one step. Detail in the spec's **As shipped**.

---

## Program non-goals

- New app modes
- Drag-and-drop object routing (until after P1)
- Cloud accounts or sync
- Stuffing map blobs into `bg-user-save/1`
- Board/Tracker → Lore automation
- Event bus / DI / central dispatcher for cross-module ops
- Persistent Foundry-style combat log (P4 is ephemeral awareness only)
- Becoming a VTT / Foundry-style rules automation
- CR↔level conversion

---

## Checklist (implementation)

- [x] P1 Action consistency (`actionsFor`)
- [x] P2 Save finishing polish (last downloaded save)
- [ ] P2b Campaign archive
- [x] P3 Builder ↔ Library fit (`BUILD.fits` simulation)
- [x] P4 Recent combat events (semantic, ephemeral)
- [x] P5 Resume Board (`BOARD.lastOpen` / `openBoard` + `#hdrResume`)
- [x] P7 Forge roles (role chips + band strip; PF2e `abilityMods: null`)
- [x] P6 Maps linked tokens (scope expansion; token `ref` + Open / Tracker / locate bridges)
- [x] P8 Copy Board note to Lore (headless `LORE.createPage` / `listPages`; `board-markdown` **Copy to Lore…**)

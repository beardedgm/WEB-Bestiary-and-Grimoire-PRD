# P1 — Action consistency — 2026-09-03

**Status:** Implemented.
**Roadmap:** [`../plans/2026-09-03-connected-improvements-roadmap.md`](../plans/2026-09-03-connected-improvements-roadmap.md)

## Problem

Send to Board, Table Load/Open/Send, Builder Load, Lore Pin, and reading-pane actions are
scattered helpers with inconsistent labels. The GM cannot predict which verbs exist on
which object from which surface.

## Metric

Time from “I need this creature” to it landing in Builder / Tracker / Board.

## Approach (locked)

Normalize **discoverability and action policy**, not application ownership.

- `actionsFor(subject, context)` returns UI/action descriptors (canonical label, primary
  flag, invoke via existing module APIs).
- Small render helper: one primary chip + overflow (`⋯`) or same row when ≤2 actions.
- Operations remain owned by `TRK`, `BUILD`, `BOARD`, `LORE`, etc. (guarded `window.*` APIs).
- **No** event bus, service container, dependency injection, or giant dispatcher.

## Acceptance criteria

- Call sites (including `addSendToBoard`, Table, Builder, Lore Pin, reading pane) use
  `actionsFor` + the shared render helper for discoverable verbs.
- Canonical labels: `Open` · `Board` · `Builder` · `Tracker` · `Maps` (P8 `Copy` later).
- Contextual **one** primary; secondary in overflow or same row when ≤2.
- Same labels on reading pane and Table/Board cards for the same verbs.
- Modules stay independently removable; cross-module calls stay guarded.
- No drag-and-drop in this phase.

## Non-goals

- Centralizing operation ownership into a new action framework
- Drag/drop routing
- New object types or modes
- Maps linked-token verbs (P6)
- Copy to Lore (P8)

## Primary files

- `app.template.html` — Script 1 + TRK / BUILD / BOARD / LORE call sites
- Update connected-workflow integration checklist when shipping

## As shipped

`actionsFor(subject, context)` and `mountActionChips(container, actions, opts)` live in
Script 1 and are published on `window`. Subject kinds: `record`, `preset`, `builder-draft`,
`lore`, and (P8) `board-markdown`. Verbs shipped: **Open · Board · Builder · Tracker**, plus
**Copy to Lore…** once P8 spent the reserved `Copy`. `Maps` stayed unshipped (P6 links
map-side).

- Builder-draft and Lore subjects live inside their module's IIFE, so those call sites pass
  their own run functions in `context.run`; `actionsFor` still owns label, primary and the
  disabled policy.
- `context` also takes `primary` (which verb wins the `.go` chip) and `omit` (the Board
  encounter card omits `Board` — it is already on the board).
- `mountActionChips` keeps everything on one row at ≤2 verbs and moves secondaries into a
  `⋯` menu above that. A verb marked `confirms` leaves the menu open so `TRK.confirmSwap`
  can swap its Yes/No prompt into the chip.
- The reading pane's lone `Board` chip stays a plain chip: there is no competing verb for a
  primary to win over, and reading is the point of that surface.
- **P6 extended `record`, not the Library.** A `record` subject also yields `Open` and (for
  creatures) `Tracker` when `context.surface !== "library"`, which is how a Maps token that
  stores only an id gets verbs. The Library pane is deliberately excluded: there the pane
  *is* the open record, and its list row already carries the add control. `Maps` itself
  stayed unshipped as a verb — P6 links map-side only.
- **P8 spent `Copy`.** A `board-markdown` subject yields one **Copy to Lore…** chip on Board
  markdown cards — the only label that names its destination, because it is the only verb
  that copies rather than routes. Like `builder-draft` and `lore` it passes `context.run`;
  `actionsFor` omits the verb entirely when `LORE.createPage` is absent.

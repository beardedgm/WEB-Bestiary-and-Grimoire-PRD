# P1 — Action consistency — 2026-09-03

**Status:** Stub (revised). Implementation not started.
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

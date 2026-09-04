# P8 — Copy Board note to Lore — 2026-09-03

**Filename note:** Path kept as `2026-09-03-board-promote-to-lore.md` for stable links;
canonical product name is **Copy to Lore…** (not Promote).

**Status:** Stub (revised). Implementation not started.
**Roadmap:** [`../plans/2026-09-03-connected-improvements-roadmap.md`](../plans/2026-09-03-connected-improvements-roadmap.md)
**Depends on:** Board + Lore stable (campaign lore pages)

## Problem

Useful session notes on Board markdown should sometimes become durable adventure text, but
auto-capture would break ownership (Board = tonight; Lore = manuscript). A generic
“Promote to Lore” button risks turning Lore into a session-history repository — the exact
outcome the ownership contract prevents.

## Metric

Session note can become durable adventure text without leaving the ownership model.

## Approach (locked)

```text
Board note
   ↓
Copy to Lore…
   ↓
New Lore page
   ↓
Choose parent chapter
   ↓
Copy title + markdown
```

Properties:

- Explicit user action only
- **Copies**, never moves; Board original stays
- No synchronization afterward; new Lore page is canonical adventure material
- Hydrate large markdown bodies from IndexedDB before copying
- Board calls a real **LORE creation API** — does not mutate Lore internals

Framing: “This session note turned out to be useful adventure material,” not “Archive
tonight’s session into Lore.”

## Acceptance criteria

- User-initiated **Copy to Lore…** on Board markdown (canonical verb `Copy`).
- Flow creates a new Lore page under the active campaign with parent-chapter choice.
- Confirm before write; failures surface inline (no `window.confirm` / `alert`).
- Board card remains; no live sync between card and page.
- Large IDB-backed bodies are hydrated before copy.
- **Not** automatic capture from Board or Tracker.

## Non-goals

- Board/Tracker → Lore **automation** (still closed in connected-workflow)
- Bidirectional live sync
- “Promote” / archive semantics that encourage dumping session logs into Lore
- Copying non-markdown card types in v1
- Moving Lore into IndexedDB

## Primary files

- `app.template.html` — BOARD + LORE / CAMPAIGN lore pages

# P6 — Maps linked tokens — 2026-09-03

**Status:** Stub (revised). Implementation not started.
**Roadmap:** [`../plans/2026-09-03-connected-improvements-roadmap.md`](../plans/2026-09-03-connected-improvements-roadmap.md)
**Depends on:** P1 recommended; ships **after P7** in program order
**Prior art:** Track E in [`../plans/2026-08-28-maps-phase3-deferred.md`](../plans/2026-08-28-maps-phase3-deferred.md)

## Decision (intentional scope expansion)

Library-linked map tokens were an **explicit non-goal** in the Maps backlog and in
[`2026-08-29-maps-tokens-and-grid.md`](2026-08-29-maps-tokens-and-grid.md) (“Not Library-linked
monsters”). That non-goal stands until this phase ships.

**Decision:** Reopen Library-linked Maps tokens because the connected-object model now makes
the benefit worth the additional coupling. Update backlog / token-grid docs when implementing
so the repo does not simultaneously say “non-goal” and “tokens reference Library records.”

## Problem

Exploration still forces tool-switching: map tokens are decorative; opening a Library record
or sending a combatant to Tracker from the map is missing.

## Metric

Fewer tool changes during exploration / spatial adjudication.

## Approach (locked)

Optional Library `ref` on the token — reference by id, **not** copied monster state:

```js
{ x, y, label, icon, /* … */, ref: "pf2e:b1:goblin-warrior" }
```

Extend `vToken` to accept optional validated `ref`. Open record / Tracker / locate bridges
only where they speed spatial adjudication. Verb labels match P1 matrix.

## Acceptance criteria

- Tokens may carry optional `ref` (Library id); display/spatial fields unchanged when absent.
- Open Library record from map context when `ref` resolves.
- Send to Tracker / locate-combatant bridges as needed for adjudication (not VTT parity).
- Docs that called linked tokens a non-goal are updated in the same change that ships P6.

## Non-goals

- Fog of war, multiplayer, initiative on the map canvas
- Becoming a VTT
- Map blobs in `bg-user-save/1` (still separate export / P2b archive)
- Copied/duplicated monster state on the token
- Drag-from-Library unless P1 landed and product re-opens drag

## Primary files

- `maps/maps-app.js` — `vToken` + UI
- `app.template.html` — MAPS bridges / Script 1 record open

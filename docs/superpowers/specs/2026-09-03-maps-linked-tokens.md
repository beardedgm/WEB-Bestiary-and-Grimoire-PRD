# P6 — Maps linked tokens — 2026-09-03

**Status:** Implemented.
**Roadmap:** [`../plans/2026-09-03-connected-improvements-roadmap.md`](../plans/2026-09-03-connected-improvements-roadmap.md)
**Depends on:** P1 recommended; ships **after P7** in program order
**Prior art:** Track E in [`../plans/2026-08-28-maps-phase3-deferred.md`](../plans/2026-08-28-maps-phase3-deferred.md)

## Decision (intentional scope expansion)

Library-linked map tokens were an **explicit non-goal** in the Maps backlog and in
[`2026-08-29-maps-tokens-and-grid.md`](2026-08-29-maps-tokens-and-grid.md) (“Not Library-linked
monsters”).

**Decision:** Reopen Library-linked Maps tokens because the connected-object model now makes
the benefit worth the additional coupling. That non-goal is **now closed as intentionally
reopened**; the backlog, token-grid and Maps phase 2/3 docs were updated in the same change
that shipped this, so the repo does not simultaneously say “non-goal” and “tokens reference
Library records.”

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

## Shipped

`vToken` gained `ref: vRef(raw.ref)` — a trimmed id string ≤120 chars or `null`, resolved
lazily at display time because an imported `.hexplora` may name a record this install does
not carry. Nothing else about the record is stored, so an unlinked or unresolvable token
renders and behaves exactly as before and export/import round-trips through the same
validator.

Three Script 1 bridges back it, because a surface that holds only an id needs the Library to
resolve, search and open one: `recordRef(id)` and `searchRecordRefs(q, {kind, limit})` return
flat `{ id, name, kind, sys, rank, custom }` copies (a reference holder must not be able to
edit `DATA` through them), and `openRecordById(id)` leaves Board / Forge / Lore / Maps for
Browse before `setSide` + `pickById`, since those modes replace `<main>`. `TRK` gained
`addByRef(id)` — `addFromView` and it now run one `addFromRecord`, so the HP-less PF2e branch
still opens the add form rather than fabricating HP — plus a read-only `combatantsByRef(id)`.

`actionsFor`'s `record` branch adds **Open** and **Tracker** when `ctx.surface !== "library"`;
the Library pane is unchanged, because there the pane *is* the open record and the list row
already carries the add control. The token editor mounts those verbs with
`mountActionChips`, so Maps names no labels of its own and each operation stays owned by its
module. `combatantsByRef` prints the locate line ("On the tracker: Goblin 1 12/16 HP"), which
is the adjudication answer the map could not give before.

Linking is a search field in the token editor: two characters filter creature names, picking
one sets the pending ref (and seeds an empty label with the record's name, which the GM can
still edit before Save), and **Unlink** clears it. The pending ref is held aside like every
other field in that modal, so Cancel and Esc drop it.

Not shipped, deliberately: pinning Library → Maps. The link is made map-side only, so the
Library needs no knowledge of which map is open or where a token would land.

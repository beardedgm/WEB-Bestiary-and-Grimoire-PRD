# Post–Maps backlog roadmap — 2026-08-28

**Status:** Post–Maps backlog complete as of 2026-08-29. Sequenced improvement work lives in
[`2026-09-03-connected-improvements-roadmap.md`](2026-09-03-connected-improvements-roadmap.md)
(P1–P8).

Phases 0–3 of the **connected workflow**, **Maps phase 2–3**, **Board storage v2**, and **PF2e 0 XP** are shipped on `main`.

---

## Shipped (final milestone)

| Area | Spec / plan |
|------|-------------|
| Maps token SVGs + layout | [`2026-08-29-maps-tokens-and-grid.md`](../specs/2026-08-29-maps-tokens-and-grid.md) |
| Maps square grid | same |
| Maps shortcuts + Ctrl+D | [`2026-08-29-maps-phase3-tokens-grid.md`](2026-08-29-maps-phase3-tokens-grid.md) Track C |
| Maps shape resize | [`2026-08-29-maps-shape-resize.md`](../specs/2026-08-29-maps-shape-resize.md) |
| PF2e out-of-±4 at 0 XP | [`2026-08-28-pf2e-out-of-band-zero-xp.md`](2026-08-28-pf2e-out-of-band-zero-xp.md) |
| Board IDB markdown bodies | [`2026-08-29-board-markdown-idb.md`](../specs/2026-08-29-board-markdown-idb.md) |
| Board zip export/import | [`2026-08-29-board-zip-export.md`](../specs/2026-08-29-board-zip-export.md) |

---

## Explicit non-goals (no plan unless requested)

- Lore pages in IndexedDB
- Quest / Audio / share / QR
- Map blobs in portable `bg-user-save/1`

**Intentional scope expansion (P6, shipped):** Library-linked map tokens were an explicit
non-goal here and in the Maps token/grid spec. They were **reopened and shipped** as **P6**
in [`2026-09-03-connected-improvements-roadmap.md`](2026-09-03-connected-improvements-roadmap.md)
because the connected-object model made the benefit worth the coupling. A map token may now
carry an optional Library `ref` (an id, never copied monster state). What stays closed: Maps
as a VTT — no fog of war, multiplayer, initiative on the canvas, or rules automation.

---

## Improvement mode

Prefer the connected improvements roadmap (P1–P8) over ad-hoc mode chrome.
See [`2026-09-03-connected-improvements-roadmap.md`](2026-09-03-connected-improvements-roadmap.md).

Small UX polish, corpus gaps, and performance fixes may still ship as one-off specs outside
that sequence when they do not conflict with the locked verb matrix or ownership rules.

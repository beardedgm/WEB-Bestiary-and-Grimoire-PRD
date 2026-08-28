# Post–Maps backlog roadmap — 2026-08-28

Phases 0–3 of the **connected workflow** and **Maps phase 2** are shipped on `main`. This document prioritizes **unbuilt** work.

**Maps phase 3 spec:** [`2026-08-29-maps-tokens-and-grid.md`](../specs/2026-08-29-maps-tokens-and-grid.md) · **Plan:** [`2026-08-29-maps-phase3-tokens-grid.md`](2026-08-29-maps-phase3-tokens-grid.md)

---

## Already shipped (do not re-plan)

| Area | Shipped behavior |
|------|------------------|
| Connected workflow Phases 0–3 | Forge, linked Board cards, encounter cards, Lore + Pin |
| Campaign + Maps phase 2 | HexPlora interaction parity, drawer trays |
| Board markdown v1 | GFM tables, debounced save, preview cache, expand overlay |
| Lore format bar + tree | Grouped toolbar, DnD, mobile Pages sheet |
| Maps keyboard (partial) | Undo, r/h/t, Space, Delete, measure Backspace |

---

## Priority order (remaining work)

| P | Track | Plan | Status |
|---|--------|------|--------|
| **1** | Maps: token SVGs + layout | phase3-tokens-grid Track A | Shipped |
| **2** | Maps: square grid | phase3-tokens-grid Track B | Shipped |
| **3** | PF2e out-of-±4 at 0 XP | `2026-08-28-pf2e-out-of-band-zero-xp.md` | Shipped |
| **4** | Maps: `?` + Ctrl+D | phase3-tokens-grid Track C | Shipped |
| **5** | Board: IndexedDB bodies | `2026-08-28-board-lore-storage.md` | Planned |
| **6** | Maps: shape resize handles | `2026-08-28-maps-phase3-deferred.md` C | Deferred |
| **7** | Board: zip with assets | board-lore-storage Track B | Planned |
| **8** | Plan doc housekeeping | `2026-08-28-plan-doc-housekeeping.md` | Shipped |

**Removed:** Library-linked map tokens.

---

## Suggested merge order

1. Maps phase 3 (tokens → square grid → polish) — one or more PRs
2. PF2e 0 XP
3. Board IDB → zip
4. Doc housekeeping + shape resize (optional)

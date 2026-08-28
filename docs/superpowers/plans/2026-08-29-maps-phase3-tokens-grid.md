# Maps phase 3 — tokens, square grid, polish

> **Spec:** `docs/superpowers/specs/2026-08-29-maps-tokens-and-grid.md`

**Status:** Shipped on `main` as of 2026-08-29. Implementation steps below are archival; see PRODUCT.md / specs for current behavior.


**Goal:** Ship token SVG icons with HexPlora layout, square grid mode, and keyboard polish.

## Track A — Token SVGs + layout

- `maps/token-icons/*.svg`, `maps/token-icons.manifest.js`
- Refactor `drawTokens()` in `maps/maps-app.js`
- `vToken` slug + aliases; populate icon `<select>` elements in JS

## Track B — Square grid

- `gridKind` in `vSettings` / `DEFAULT_SETTINGS`
- `generateSquareGrid`, `findCellAt`, `cellNeighbors`
- Branch `drawGridFog`, `paintCell`, measure, snap
- `#mapsGridKind` in settings tray

## Track C — Polish

- `#mapsShortcutOvl` + `?` key
- `duplicateSelection()` + Ctrl/Cmd+D

## Related backlog (separate plans)

- PF2e 0 XP: `2026-08-28-pf2e-out-of-band-zero-xp.md`
- Board storage: `2026-08-28-board-lore-storage.md`

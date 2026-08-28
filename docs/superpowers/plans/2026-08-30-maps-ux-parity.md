# Maps UX parity — 2026-08-30

Implementation plan for measure tool parity, fog/settings tray cleanup, pan-move annotations, and tray-based shape/stroke editing.

**Specs:**
- [`2026-08-30-maps-measure-parity.md`](../specs/2026-08-30-maps-measure-parity.md)
- [`2026-08-30-maps-drawer-settings.md`](../specs/2026-08-30-maps-drawer-settings.md)

**Shipped in one integration pass** (all four tracks). HexPlora reference: `APP-Hexplora-PRD`.

## Tracks

1. Measure — distance labels, finalize (right-click/Esc/tool switch), live readout
2. Fog — Settings tray; Reveal/Hide no drawer
3. Move — shape/stroke drag in pan mode
4. Selection tray — shape/stroke properties; modals retained for text/token/measurement color

## CI

`python3 build_bundles.py --check`, `check_inline_scripts.py`, `node --check maps/maps-app.js`

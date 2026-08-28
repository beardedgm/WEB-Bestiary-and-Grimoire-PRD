# Maps — measure tool HexPlora parity — 2026-08-30

## Purpose

Distance measurements connect hex/cell centers with cumulative distance labels. Acceptance reference: `APP-Hexplora-PRD/client/src/canvas/pixiMeasurementLayer.js`, `client/src/input/mouse.js`, `client/src/text/textSizing.js`.

## Distance math

| Input | Formula |
|-------|---------|
| Segments | `hexCount - 1` |
| Total distance | `segments × hexDistanceValue` |

Label: `{segments} hex · {distance} {unit}` when `segments > 0`; single hex shows `1 hex` only.

## Interaction

- Left-click adjacent cells to build path (hex or square grid via `cellNeighbors`).
- Right-click, Esc (≥2 hexes), or switching off Measure tool **finalizes**.
- Esc with one hex **cancels**.
- Backspace pops last hex.
- Toasts: non-adjacent hex, duplicate hex in path.

## Rendering

- Polyline through cell centers, vertex dots, label at last point.
- Active path: same color, alpha 0.7.
- Finalized measurements store baked `color`; distance text uses current `hexDistanceValue` / `hexDistanceUnit` at render time.
- `scaleForMap` scales line width, dots, and label font with `hexSize` and `mapScale`.

## UI

- Tray hint documents finalize shortcuts.
- `#mapsMeasureLive` shows running total while measuring.
- Shortcut table includes right-click finalize.

## Verification

Manual: 8 mi/hex, 3-hex path → `2 hex · 16 miles`. Import `.hexplora` with measurements still draws lines + labels.

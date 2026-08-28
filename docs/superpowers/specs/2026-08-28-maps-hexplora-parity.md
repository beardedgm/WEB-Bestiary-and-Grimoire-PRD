# Maps — HexPlora interaction and tool parity — 2026-08-28

## Purpose

Bring B&G **Maps** mode to HexPlora-class interaction and per-tool settings parity. `APP-Hexplora-PRD` (sibling repo) is the acceptance reference for behavior and information architecture — not a React/CSS port.

## Layout (map-first)

| Concern | HexPlora source | B&G implementation |
| --- | --- | --- |
| Drawer trays | `data-drawer-view` on `.side-drawer` (`map` / `tool` / `danger`) | `#mapsDrawer[data-drawer-view]` — `maps` \| `settings` \| `tool` \| `danger` |
| Toolbar entry | Settings cog → grid tray; tools → tool tray | **Maps** chip → map list; **Settings** chip → grid/session; tool chips → tool tray |
| Push-aside (desktop) | `.side-drawer` flex sibling; `width: 0` when closed | `.maps-drawer` in `.maps-body` row; `.closed` collapses to 0 width; Pixi `resize()` on toggle |
| No header overlap | HexPlora has no app header | `#mapsTools` toolbar **above** `.maps-body`; drawer never covers global header or maps toolbar |
| No permanent right panel | Canvas is hero in `MapPage.jsx` | Removed `.maps-settings` right column |

## Interaction parity

| Behavior | HexPlora | B&G |
| --- | --- | --- |
| Pan-mode selection | `mouse.js` `clearAllSelections`, per-object pick | `pickPanTarget`, `selectKind`, gilt selection chrome |
| Delete cascade | `keyboard.js` L244–301: token → measurement → text → stroke → shape | `deleteSelection()` + keyboard Delete/Backspace |
| Modal Delete | `text-delete-btn`, `token-delete-btn` | `#mapsTextDelete`, `#mapsTokDelete`, stroke/shape/measurement modals |
| Text input | Multi-line textarea | `#mapsTextInput` textarea; Add vs Save label |
| Measurement Backspace | `keyboard.js` L237 | Pops last hex while measuring |
| Eraser | `hitTest.js` + brush erase path | `eraseAlongPath` when `#mapsEraser` checked |
| Shape modifiers | `applyShapeModifiers` Shift/Alt | Same during shape drag |
| Token hex snap | `mouse.js` ~892 | Snap to `findHexAt` unless Alt |
| Token multi-place | Drawer checkbox | `#mapsTokMulti` |
| Edit modals | stroke/shape/measurement modals in `MapPage.jsx` | `#mapsStrokeOvl`, `#mapsShapeOvl`, `#mapsMeasOvl` on double-click |

## Per-tool settings (tool tray)

Only one `#mapsToolSettings[data-active-tool]` group visible at a time (CSS mirrors HexPlora `style.css` L876–897). Synced live via `readToolSettingsLive` / `syncToolSettingsForm`:

- **Reveal/Hide** — fog color + opacity (not in Settings tray)
- **Brush** — color, thickness, opacity, eraser
- **Rect / Ellipse / Arrow / Line** — separate panels per shape kind
- **Measure** — line color, hex distance, unit
- **Text** — color, S/M/L/custom px, outline color/width/opacity, contrast presets
- **Token** — icon, color, size, multi-place

**Settings tray** (`#mapsDrawerSettings`): grid structural fields + grid appearance + session export/rename + link to danger tray. Grid batch edits use **Apply grid** (`#mapsApplySettings`).

## Explicit non-goals (deferred)

- Shape resize handles after placement

**Shipped (phase 3):** SVG token icons + HexPlora layout; `?` shortcut help; Ctrl+D duplicate; square grid mode (`2026-08-29-maps-tokens-and-grid.md`).

## Verification

Manual side-by-side with local HexPlora build: drawer trays exclusive, desktop push-aside, header/toolbar never covered, select + Delete, tool settings per tool.

CI: `python3 build_bundles.py --check`, `python3 check_inline_scripts.py`.

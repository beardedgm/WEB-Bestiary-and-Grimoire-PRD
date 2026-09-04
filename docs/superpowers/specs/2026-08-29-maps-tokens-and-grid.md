# Maps — token SVG icons, layout parity, square grid — 2026-08-29

## Purpose

Maps phase 3: custom B&G token icons with HexPlora-class layout, plus optional square grid mode.

**Scope note:** Library-linked tokens were out of *this* phase and are now shipped separately
as **P6** — an intentional reopen of that non-goal, specced in
[`2026-09-03-maps-linked-tokens.md`](2026-09-03-maps-linked-tokens.md) and
[`../plans/2026-09-03-connected-improvements-roadmap.md`](../plans/2026-09-03-connected-improvements-roadmap.md).
A token may carry an optional Library `ref` id; everything in the table below (icon slug,
label, layout, sizing) is unchanged by it, and a token without a `ref` renders exactly as
this phase shipped it.

## Token icons and layout

| Criterion | Acceptance |
|-----------|------------|
| Icon storage | `token.icon` is a picker slug (`skull`, `home`, `""`) or, since 2026-09-04, any well-formed Material Symbols name (`/^[a-z][a-z0-9_]{0,31}$/`) a `.hexplora` file carried in — kept, not dropped to `""` |
| Legacy import | Unicode icons (`★`, `⌂`, `☠`, …) migrate to slugs in `vToken`; a foreign Material name renders by ligature from the same font, appears in the token editor as "*name* (imported)" so Save round-trips it, and is named in the import toast. A name the font does not ligate is dropped at draw time, never painted as letters |
| Icon sprites | One cached **texture** per glyph-and-size, a new `PIXI.Sprite` per token — a cached sprite has one parent and was hopping between every token that shared an icon, so only the last drawn kept it |
| Assets | `maps/token-icons/*.svg` + `maps/token-icons.manifest.js` |
| Render | Pixi `Container`: filled disc; white-tinted SVG sprite centered; label `Text` below disc |
| Sizing | `radius = hexSize * 0.4 * TOKEN_SIZES[size]`; label at `y = hexSize * 0.5 * sizeScale`, anchor `(0.5, 0)`, white fill + dark stroke |
| UI | `#mapsTokIconDrawer` and `#mapsTokIcon` populated from manifest at bind time |
| HexPlora import | Accept Material slug names (`skull`, `home`, `swords`, …) via alias table |

## Square grid

| Criterion | Acceptance |
|-----------|------------|
| Setting | `settings.gridKind`: `hex` \| `square` (default `hex`) |
| Cell size | Reuses `hexSize` field as cell edge length |
| Fog keys | `"col-row"` unchanged |
| Measure | 4-way orthogonal adjacency |
| Token snap | Cell center unless Alt |
| Settings | Grid kind in Settings tray; hide Orientation when square |
| Back compat | Missing `gridKind` → hex |

## Maps polish (phase 3c)

- `?` opens shortcut help overlay (`#mapsShortcutOvl`)
- Ctrl/Cmd+D duplicates selected token

## Non-goals

- Library `ref` on tokens
- Quest / Audio / share / QR
- Map blobs in portable JSON

## Verification

`node --check maps/maps-app.js`, `build_bundles.py --check`, `check_inline_scripts.py`; manual token + square grid QA.

# Lore tree structure (nest anywhere + reorder)

Extend Lore’s page rail so GMs can nest under any page and reorder/reparent
without fighting create-order. Complements Lore v1
(`docs/superpowers/specs/2026-08-26-lore-v1-design.md`).

## Problem

“New child” uses selection, but create auto-selects the new page, so nesting
feels glued to the newest row. There is no per-row nest control and no way to
change sibling order or parent after create.

## Decisions (locked)

| Question | Choice |
|---|---|
| Nest affordance | Per-row **`+`** plus existing rail New page / New child |
| Reorder UI | Tracker-parity **handle-only HTML5 DnD** (no library) |
| Keyboard | **Alt+↑/↓** siblings; **Alt+→/←** indent / outdent |
| Schema | Unchanged `parentId` + `camp.pages[]` order |
| While filtered | DnD **disabled**; row `+` still works |

## Drop semantics

- Before / after a row → insert among that row’s siblings (adopt that row’s `parentId`).
- Onto a row (middle band) → reparent under that page as last child.
- Cycle (self / descendant) → no-op + announce.
- Filter or tag active → handles not draggable.

## Non-goals

Multi-select, cross-campaign drag, collapse/expand, Board card order, new storage keys.

## Acceptance

1. Row `+` nests under that page without requiring prior selection.
2. Drag handle reorders siblings and reparents; keyboard matches.
3. Filtered tree cannot drag; cycle blocked with toast.
4. PRODUCT / DESIGN updated; `build_bundles.py --check` clean.

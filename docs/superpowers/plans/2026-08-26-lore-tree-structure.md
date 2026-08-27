# Lore tree structure — implementation plan

**Shipped:** Per-row Add child + Tracker-style handle DnD (before/after/into) and
Alt+Arrow sibling/indent/outdent on the Lore page tree; drag disabled while filtered.

**Goal:** Per-row Add child + Tracker-style drag/keyboard reorder-reparent in the
Lore page tree (`bg.lore.v1` unchanged).

**Spec:** `docs/superpowers/specs/2026-08-26-lore-tree-structure-design.md`

## Approach

1. Tree row chrome: drag handle | title | `+` in `#loreTree`.
2. Structure helpers in `LORE`: `isDescendant`, `reorderPage`, `moveSibling`,
   `indentPage`, `outdentPage`; expose on `LORE._test`.
3. DnD on `#loreTree` mirroring `#trklist` (handle-only, gap + into).
4. Alt+Arrow on focused tree title.
5. Docs + `python3 build_bundles.py` / `--check`.

## Files

- `app.template.html` — CSS, `renderTree`, helpers, listeners
- `PRODUCT.md`, `DESIGN.md`
- This plan + design spec

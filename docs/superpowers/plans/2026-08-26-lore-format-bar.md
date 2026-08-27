# Lore markdown format bar (2026-08-26)

## Goal

Quick on-the-fly styling for Lore pages without a block editor: keep `page.body` as
markdown in a `<textarea>`, add chip controls that wrap/prefix the caret or selection.

## Shipped

- `#loreFmt` chip toolbar covering what Board’s `md()` can render for campaign notes:
  - **Inline:** Bold, Italic, Code (`Mod+B` / `Mod+I` / `Mod+E`)
  - **Headings:** H1 / H2 / H3 (`#` … `###`)
  - **Lists:** bullet (`- `) and numbered (`1. ` …)
  - **Quote:** read-aloud `> ` (olive in Preview / Board)
  - **Inserts:** fenced `Block` (```), two-column `Table` scaffold
- Block chips **toggle** when already applied and **swap** (strip prior heading/list/quote
  prefix) instead of stacking `## ##`
- Oversize formatting **refuses** (announce) instead of truncating; Preview hides `#loreFmt`
  via `[hidden]{display:none !important}`; block selection ignores a trailing `\n`; fenced
  Block inserts a newline after the closer when prose follows
- Toolbar hidden in Preview; `#lore .lore-preview` mirrors Board `.md-view` styles
- Docs: PRODUCT, DESIGN

## Out of scope

Slash menu, floating bubble, Board expand format bar, image/link parser extensions
(renderer still does not support `![]()` / `[]()`).

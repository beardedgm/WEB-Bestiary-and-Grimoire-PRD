# Linked Board cards (connected workflow, Phase 1)

Shipped: **record** Board card that references a Library monster/spell by id and renders the
live stat block via `monsterHTML` / `spellHTML`. **Send to Board** chip under the reading-pane
header calls `BOARD.addRecord(id)` without switching modes. First slice of the connected
workflow (see `docs/superpowers/specs/2026-08-26-connected-workflow.md`).

## Decisions

- Reference, never copy: cards persist as `{type:"record", ref}` inside `bg.board.v1`; a ref
  that no longer resolves (removed custom, import on another machine) stays **valid** in
  `vCard` and renders a missing-record notice — matches the parse-status honesty philosophy
- `ID_INDEX` lookup behind the `typeof ID_INDEX !== "undefined"` guard (same precedent as
  BUILD's `recordOf`); Script 1 guards the chip with `window.BOARD && BOARD.addRecord`
- Send to Board injected in `renderRecord` (Script 1), not in `monsterHTML`/`spellHTML` —
  those renderers are reused by Board cards, Forge preview, and player display
- Click-to-roll delegation moved from `#pane` to `document` so dice buttons work in Board
  record cards (and spell peek / Forge preview, which sit outside `#pane`)
- Record cards are not on the add rail (a blank ref is meaningless); they enter via the chip
- `cardHasSubstance` returns false for record cards: re-creatable in two clicks, no
  remove confirmation
- No drag-and-drop from the list, no encounter cards, no Board-side editing (out of scope)

## Files

- `app.template.html` — `CARD_TYPES`/`vCard`/`addCard`/`fillRecord`/`addRecord` in BOARD;
  `addSendToBoard` + document-level `.droll` delegation in Script 1/TRK; record-card CSS
- `PRODUCT.md`, `DESIGN.md`, `CLAUDE.md` — card list, principle 6, record-card styling rule
- `docs/superpowers/specs/2026-08-26-connected-workflow.md` — lifecycle, ownership,
  integration contract, phased roadmap

# Board — IndexedDB markdown bodies — 2026-08-29

## Purpose

Move large Board markdown `body` strings out of `bg.board.v1` to reduce `localStorage` quota pressure.

## Storage split

| Location | Holds |
|----------|--------|
| `bg.board.v1` | Card metadata; inline `body` when `body.length ≤ 8000` |
| IndexedDB `bg-board-bodies` v1, store `bodies` | `{ id: cardId, boardId, body, updated }` for large bodies |

Card adds optional `bodyRef: "idb"` when body is external; persisted `body` is `""`.

## Rules

- `BODY_INLINE_MAX = 8000` characters
- `MD_HARD = 120000` unchanged; IDB stores full validated body
- **Repair:** inline `body` wins over IDB if both present (`bodyRef` cleared)
- Delete card or board → delete IDB row(s)
- Duplicate board → copy IDB bodies to new card ids
- Portable `bg-user-save/1` export **inlines** IDB bodies into JSON

## Acceptance

- 60k-char note survives reload; `bg.board.v1` stays small
- Notes under 8k remain fully inline
- CI: `build_bundles.py --check`, `check_inline_scripts.py`

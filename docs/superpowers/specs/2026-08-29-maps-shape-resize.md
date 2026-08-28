# Maps — shape resize handles — 2026-08-29

## Purpose

Resize placed annotation shapes without recreating them.

## Handles

| Shape type | Handles |
|------------|---------|
| `rect`, `circle` | 4 corners (bbox) |
| `line`, `arrow` | 2 endpoints |

## Modifiers

Reuse `applyShapeModifiers` during drag: Shift (square/circle), Alt (from center).

## Interaction

- Pan tool + selected shape: drag handle resizes
- `pushUndo` on resize start; `scheduleSave` on pointer up
- Double-click modal edit unchanged

## Non-goals

Rotate, skew, multi-select resize.

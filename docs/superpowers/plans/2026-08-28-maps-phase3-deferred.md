# Maps phase 3 — deferred parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Status:** Shipped on `main` as of 2026-08-29. Implementation steps below are archival; see PRODUCT.md / specs for current behavior.


**Goal:** Ship the highest-value **deferred** Maps items from `docs/superpowers/plans/2026-08-27-maps-phase2.md` in small, independently mergeable tracks.

**Already shipped (do not redo):** `onKey` in `maps/maps-app.js` already binds Undo/Redo, `r`/`h`/`t`, Space→pan, Delete/Backspace delete-selection, and measure-path Backspace. Tracks A–B add only the **help modal** and **Ctrl+D duplicate** — not a full keyboard layer.

**Architecture:** Each track is a separate PR. Reference HexPlora (`APP-Hexplora-PRD`) for behavior only. All UI changes go through `app.template.html` + `maps/maps-app.js`; rebuild `index.html` after template edits.

**Tech Stack:** Pixi 8 (`maps/maps-pixi.bundle.js`), vanilla JS, IndexedDB `bg-maps` (unchanged).

## Global Constraints

- Maps toolbar stays **above** `.maps-body`; drawer must not cover app header or `#mapsTools`.
- Persisted state through `vState` validators in `maps-app.js`; never write unvalidated blobs.
- Portable `bg-user-save/1` remains **maps meta only** (Track F is out).
- Manual browser QA against local HexPlora after each track.
- CI: `node --check maps/maps-app.js`, `python3 build_bundles.py --check`, `check_inline_scripts.py`.

---

## Track A — Keyboard shortcut help modal

**Reference:** HexPlora `keyboard.js` shortcut map (read-only).

**Files:**
- Modify: `app.template.html` — `#maps` markup + CSS; new `#mapsShortcutOvl` overlay outside `<main>`
- Modify: `maps/maps-app.js` — `onKey`, bind `?` chip optional

- [x] **Step 1: Add overlay markup** (mirror `#mapsStrokeOvl` panel pattern)

Static table: Pan `Space`, Reveal `R`, Hide `H`, Token `T`, Undo `Ctrl+Z`, etc. — copy from HexPlora list, omit unimplemented shortcuts.

- [x] **Step 2: `?` key opens/closes overlay** when Maps active and focus not in input

- [x] **Step 3: Optional toolbar chip “Shortcuts”** for discoverability

- [x] **Step 4: Update** `docs/superpowers/specs/2026-08-28-maps-hexplora-parity.md` — remove “shortcut help” from deferred; note shipped.

**Acceptance:** `?` toggles modal; Esc closes; `setAppInert(true)` while open.

---

## Track B — Ctrl+D token duplicate

**Reference:** HexPlora `keyboard.js` duplicate selection.

**Files:**
- Modify: `maps/maps-app.js` — `onKey`, `duplicateSelection()`

- [x] **Step 1: Implement `duplicateSelection()`**

When `selectedToken >= 0`: `pushUndo()`, clone token with `x/y + 12`, `zIndex: nextZ++`, respect `MAX_TOKENS`.

- [x] **Step 2: Bind `Ctrl+D` / `Meta+D`** in `onKey` (preventDefault)

- [x] **Step 3: Document in shortcut modal (Track A)**

**Acceptance:** Select token → Ctrl+D → second token offset; undo restores one.

---

## Track C — Shape resize handles after placement

**Reference:** HexPlora shape edit flow (if present) or minimal bounding-box handles.

**Files:**
- Modify: `maps/maps-app.js` — selection chrome, pointer handlers, `resizeShape()`
- Modify: `app.template.html` — optional CSS for handle glyphs

- [x] **Step 1: Spec slice** — add `docs/superpowers/specs/2026-08-29-maps-shape-resize.md` (behavior: 4 corner handles for rect/circle; arrow/line endpoint handles only)

- [x] **Step 2: Draw handles in `drawAnnotations()` when `selectedShape >= 0`**

- [x] **Step 3: Pointer drag on handle updates `x1/y1/x2/y2`** with same Shift/Alt modifiers as create

- [x] **Step 4: `pushUndo` on resize start; `scheduleSave` on end**

**Acceptance:** Pan-select shape → drag handle → geometry updates; double-click modal still works.

**Non-goals:** Rotate, skew, multi-select resize.

---

## Track D — Square grid UI

**Requires:** New spec `docs/superpowers/specs/2026-08-29-maps-square-grid.md` before coding.

**Scope sketch:**
- `state.settings.gridKind`: `hex` | `square`
- New grid generator (separate from `generateHexGrid`)
- Settings tray: grid kind toggle; square cell size + offset
- Fog reveal: cell pick instead of hex pick
- Token snap: square cell centers
- Import/export: version bump in `state` with backward compat (hex default)

**Effort:** Large — do not combine with Tracks A–C in one PR.

---

## Track E — Library-linked tokens

**Status:** Specced as connected-improvements **P6** (intentional reopen of the Maps
non-goal). See [`../specs/2026-09-03-maps-linked-tokens.md`](../specs/2026-09-03-maps-linked-tokens.md)
and [`2026-09-03-connected-improvements-roadmap.md`](2026-09-03-connected-improvements-roadmap.md)
(ships after P7).

**Requires:** Product + spec for cross-mode ref (optional `ref` Library id on map token — not copied monster state).

**Scope sketch:**
- Token carries optional `ref` id
- Drawer: “Link to Library” search or paste id
- Render: badge or name from `ID_INDEX`
- Pin from Library → Maps (new chip?) — ties to connected workflow

**Effort:** Large — do not combine with unrelated Maps chrome.

---

## Track F — Explicit non-goals (no plan)

| Item | Reason |
|------|--------|
| Quest / Audio | No B&G mode ownership |
| Share / QR | Cloud; out of trust model |
| Map blobs in portable JSON | 8 MB cap; use `.hexplora` |
| React HexPlora shell | B&G is single HTML file |

---

## Suggested merge order

A → B → C → (spec) D → (spec) E

Update `docs/superpowers/plans/2026-08-27-maps-phase2.md` **Deferred** section as each track ships.

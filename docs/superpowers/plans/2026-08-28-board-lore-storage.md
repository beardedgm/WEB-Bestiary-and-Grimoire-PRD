# Board and Lore storage polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Reduce `localStorage` quota pressure for large Board session notes and improve backup portability for boards with embedded media.

**Status:** Shipped 2026-08-29 (Tracks A and B). Specs: `2026-08-29-board-markdown-idb.md`, `2026-08-29-board-zip-export.md`.

**Prerequisite (already shipped):** Board markdown v1 — GFM tables, debounced save, preview cache, expand editor, and `MD_*` caps — is live in the `BOARD` IIFE (`app.template.html`). This plan is **storage v2 only**; see `2026-08-23-board-markdown-scale-and-tables.md` for the completed v1 scope.

**Architecture:** **Track A** moves markdown `body` strings over a size threshold into IndexedDB (`bg-board-bodies`), leaving lightweight card metadata in `bg.board.v1`. **Track B** adds optional zip export/import for a single board or full `bg.board.v1` bag with assets. Lore pages stay in `bg.campaign.v1` for v1 of this plan (campaign portable save already includes lore text).

**Tech Stack:** Vanilla JS, IndexedDB (same pattern as `maps/maps-app.js` `idb` helper), no new npm deps for zip (use browser `CompressionStream` / manual zip or document `fflate` vendoring decision in spec).

## Global Constraints

- `vCard` / `vBoard` remain the honesty layer — unknown fields dropped.
- Live autosave (`save({ live: true })`) must not drop in-session cards.
- Portable `bg-user-save/1` **8 MB** import cap unchanged for JSON path.
- Board markdown caps stay: `MD_SOFT=20000`, `MD_WARN=60000`, `MD_HARD=120000` (`BOARD` IIFE ~7345).
- Edit `app.template.html`; rebuild `index.html`.

---

## Track A — IndexedDB for large markdown bodies

### Task A1: Spec and schema

**Files:**
- Create: `docs/superpowers/specs/2026-08-29-board-markdown-idb.md`

- [x] **Step 1: Define storage split**

| Location | Holds |
|----------|--------|
| `bg.board.v1` | Card metadata; `body` if `body.length ≤ BODY_INLINE_MAX` (e.g. 8_000) |
| IndexedDB `bg-board-bodies` / store `bodies` | `{ id: cardId, boardId, body, updated }` for large bodies |

Card shape adds optional `bodyRef: "idb"` when body is external.

- [x] **Step 2: Migration on load**

`vCard` reads IDB when `bodyRef === "idb"`; inline `body` wins if both present (repair).

---

### Task A2: IDB helper in BOARD

**Files:**
- Modify: `app.template.html` — `BOARD` IIFE

- [x] **Step 1: Add minimal `boardIdb` object** (open, get, put, delete) — copy structure from `maps-app.js` idb.open pattern

- [x] **Step 2: `persistCardBody(card, boardId)`**

If `card.body.length > BODY_INLINE_MAX`: put to IDB, set `card.body = ""`, `card.bodyRef = "idb"`.

- [x] **Step 3: `hydrateCardBody(card)`** on render/fillMarkdown

- [x] **Step 4: Hook `scheduleBoardSave` path** — after debounce, externalize large bodies before `localStorage.setItem`

- [x] **Step 5: Delete cascade** — removing card deletes IDB row

---

### Task A3: Portable save behavior

**Files:**
- Modify: `app.template.html` — portable save export/import (Script 1)

- [x] **Step 1: Export** — when serializing boards, **inline** IDB bodies into JSON (export is explicit backup; OK to be large)

- [x] **Step 2: Import** — on ingest, re-externalize bodies over threshold after write

- [x] **Step 3: Document in `PRODUCT.md`** — large notes may live in IndexedDB; portable JSON still works but may warn on 8 MB

---

### Task A4: Acceptance

- [x] 60k-char markdown card: edit without quota toast; reload restores body
- [x] Small note stays fully inline in `bg.board.v1`
- [x] Duplicate board copies IDB bodies with new card ids
- [x] `build_bundles.py --check`, `check_inline_scripts.py`

---

## Track B — Zip export with board assets

### Task B1: Spec

**Files:**
- Create: `docs/superpowers/specs/2026-08-29-board-zip-export.md`

- [x] **Step 1: Define `.bgboard` or `.zip` layout**

```
manifest.json    # boards bag or single board
assets/<uuid>.<ext>   # image/audio data URLs extracted
cards.json       # metadata with asset refs instead of inline data URLs
```

- [x] **Step 2: UI entry** — Board session menu: **Export board zip** (active board only for v1)

---

### Task B2: Implementation

**Files:**
- Modify: `app.template.html` — `BOARD` export helpers; header or board chrome button

- [x] **Step 1: `exportBoardZip(boardId)`** — extract `data:` URLs to files; write manifest

- [x] **Step 2: `importBoardZip(file)`** — merge into `bg.board.v1` with new ids; restore inline or IDB per Track A

- [x] **Step 3: Toast on oversize** — if zip > 50 MB, warn before download

**Depends on:** Track A recommended first (shared body externalization).

---

## Track C — Out of scope (document only)

| Item | Plan |
|------|------|
| WYSIWYG table editor | Stay markdown-source; Lore `#loreFmt` + Board `md()` sufficient |
| Full CommonMark (footnotes, task lists) | Separate plan if needed |
| Lore pages in IndexedDB | Defer until campaign save hits quota in practice |
| Forge Paper PF2e toggle | `docs/superpowers/plans/2026-08-25-forge-mode.md` non-goal |

---

## Suggested order

A1 → A2 → A3 → B1 → B2

Update `docs/superpowers/plans/2026-08-23-board-markdown-scale-and-tables.md` **Out of scope** section when Tracks A/B ship.

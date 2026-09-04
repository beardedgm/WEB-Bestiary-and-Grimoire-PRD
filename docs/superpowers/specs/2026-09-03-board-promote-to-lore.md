# P8 — Copy Board note to Lore — 2026-09-03

**Filename note:** Path kept as `2026-09-03-board-promote-to-lore.md` for stable links;
canonical product name is **Copy to Lore…** (not Promote).

**Status:** Implemented.
**Roadmap:** [`../plans/2026-09-03-connected-improvements-roadmap.md`](../plans/2026-09-03-connected-improvements-roadmap.md)
**Depends on:** Board + Lore stable (campaign lore pages)
**Amended 2026-09-03:** a plan review found the "real LORE creation API" this spec depends on
does not exist — `LORE` exposes no page-creation entry point. Building it is P8 work, and its
shape is specified below rather than left to the implementer.

## Problem

Useful session notes on Board markdown should sometimes become durable adventure text, but
auto-capture would break ownership (Board = tonight; Lore = manuscript). A generic
“Promote to Lore” button risks turning Lore into a session-history repository — the exact
outcome the ownership contract prevents.

## Metric

Session note can become durable adventure text without leaving the ownership model.

## Approach (locked)

```text
Board note
   ↓
Copy to Lore…
   ↓
New Lore page
   ↓
Choose parent chapter
   ↓
Copy title + markdown
```

Properties:

- Explicit user action only
- **Copies**, never moves; Board original stays
- No synchronization afterward; new Lore page is canonical adventure material
- Hydrate large markdown bodies from IndexedDB before copying
- Board calls a real **LORE creation API** — does not mutate Lore internals (that API does
  not exist yet; see below)

Framing: “This session note turned out to be useful adventure material,” not “Archive
tonight’s session into Lore.”

## Required LORE API (P8 work)

`LORE`'s public surface today is `{ setActive, getExport, applyUserSave, getPage,
onCampaignChanged }`. There is no creation entry point. The nearest internal is
`newPage(parentId)` in the LORE block, which is a **UI action, not a data API**: it pushes the
page, sets `selectedPageId`, clears `previewing`, calls `renderAll()`, then focuses and selects
the title input. Board must not call that — copying a note from the Board stage would yank
focus into a Lore field the GM cannot see.

Add a headless creator alongside it:

```js
LORE.createPage(campaignId, { title, body, parentId })
  // → { ok: true, id }  |  { ok: false, error }
```

- **Result object, no announcements.** Matches the `BOARD.addRecord` / `BOARD.addEncounter`
  convention Builder already consumes (`{ ok, name }` / `{ ok: false, error }`). The caller
  decides what the GM sees; the API must not call `announce()` or steal focus.
- **Enforces `MAX_PAGES` (200)** and returns `{ ok: false, error }` at the limit rather than
  announcing, as `newPage` does today.
- **Validates through the existing `vPage`**, then persists with the LORE block's `save()`,
  which already delegates to `CAMPAIGN.save()` — so `bg.campaign.v1` stays the single owner
  of lore pages and P8 adds no new storage key.
- **Refactor `newPage` to call it**, so the UI path and the Board path cannot drift. Note
  there are already **two near-duplicate `vPage` implementations** (one in `CAMPAIGN`, one in
  `LORE`); do not add a third.
- **Rejects an unknown `parentId`** the way `newPage` does (falls back to top level) rather
  than creating an orphan.

Body length needs no truncation policy: `MD_HARD` is 120,000 in both `BOARD` and `LORE`, so
any Board markdown already fits. Hydration is still required — an IDB-backed card carries
`bodyRef: "idb"` and an empty `body` until `hydrateCardBody(card)` resolves, so the Board side
of the copy is async even though `createPage` is not.

## Acceptance criteria

- User-initiated **Copy to Lore…** on Board markdown (canonical verb `Copy`).
- Flow creates a new Lore page under the active campaign with parent-chapter choice.
- Confirm before write; failures surface inline (no `window.confirm` / `alert`).
- Board card remains; no live sync between card and page.
- Large IDB-backed bodies are hydrated before copy (`bodyRef: "idb"` cards resolve first —
  copying an unhydrated card must never write an empty page).
- `LORE.createPage` exists as a headless API: returns a result object, announces nothing,
  moves no focus, enforces `MAX_PAGES`, validates through `vPage`, persists via
  `CAMPAIGN.save()`.
- `newPage` is refactored onto it, so the Lore UI and Board follow one code path.
- **Not** automatic capture from Board or Tracker.

## Non-goals

- Board/Tracker → Lore **automation** (still closed in connected-workflow)
- Bidirectional live sync
- “Promote” / archive semantics that encourage dumping session logs into Lore
- Copying non-markdown card types in v1
- Moving Lore into IndexedDB
- A new storage key for lore pages (`bg.campaign.v1` stays the owner)
- Board reaching into LORE internals (`activeCamp`, `camp.pages`, `selectedPageId`)

## Primary files

- `app.template.html` — BOARD + LORE / CAMPAIGN lore pages

## As shipped

`LORE.createPage(campaignId, { title, body, parentId, tags }) → { ok: true, id }` /
`{ ok: false, error }` is the single write path for a new page. It announces nothing, moves
no focus, refuses past `MAX_PAGES`, runs the record through the LORE block's own `vPage`
(which drops a `parentId` no page owns, so an unknown parent lands at top level rather than
orphaning the page) and persists through `save()` → `CAMPAIGN.save()`. If that write fails it
**rolls the page back out of memory** and returns the error, so a full quota can never leave a
page that exists on screen but not in storage. `newPage(parentId)` is now a thin UI wrapper:
create, then select / repaint / focus the title. No third `vPage` was added.

`LORE.listPages(campaignId)` was needed too — a parent-chapter picker cannot exist without
the chapter list, and Board must not read `camp.pages`. It returns the tree order flat as
`{ id, title, depth }` **copies**, following the `window.recordRef` rule that a reference
holder can never edit the source through the answer.

**Board side.** Markdown cards mount one action chip in the `.md-meta` row from
`actionsFor({ kind: "board-markdown", cardId }, { surface: "board-card", run: { copy } })` —
a new subject kind, and the `Copy` verb the P1 matrix reserved for P8, labelled
**Copy to Lore…**. It is the one verb whose label names its destination, because it is the
only one that copies rather than routes. Like `builder-draft` and `lore`, the subject lives
inside a module IIFE, so the operation arrives as `context.run.copy`; `actionsFor` still owns
the label and omits the verb entirely when `LORE.createPage` is absent, keeping LORE
removable. The chip is a plain chip, not `go`: it is a lone verb on a reading surface.

Clicking it hydrates the body (`hydrateCardBody`) before anything else, then swaps an inline
**Copy to Lore under [parent ▾] · Copy · Cancel** picker into the chip, the way
`TRK.confirmSwap` swaps its Yes/No — the picker *is* the confirm, so there is no
`window.confirm` and no modal over the stage. Escape or Cancel restores the chip and its
focus. Refusals are honest and distinct: an unresolved `bodyRef: "idb"` says the text could
not be read, a genuinely empty note says there is nothing to copy, and a failed
`createPage` leaves the picker open with the error in a toast. On success the Board card is
untouched and unlinked — nothing syncs afterwards.

# P5 — Resume Board — 2026-09-03

**Status:** Implemented.
**Roadmap:** [`../plans/2026-09-03-connected-improvements-roadmap.md`](../plans/2026-09-03-connected-improvements-roadmap.md)
**Depends on:** `bg.board.lastOpen.v1` (shipped); Maps has `bg.maps.lastOpen.v1` but v1 cue is Board-only

## Problem

After two weeks away, “where was I?” has no compact answer without opening Board (and Maps)
separately. A full Campaign dashboard would fight the product shape.

## Metric

After two weeks, “where was I?” without a dashboard.

## Approach (locked)

v1 cue: **Continue Board: {title}** from existing per-campaign last-open Board data.
Board is the primary session cockpit. v1 does **not** decide “most recent surface”
across Board vs Maps (no activity subsystem).

## Acceptance criteria

- Header / campaign picker shows compact **Continue Board: {title}** (or equivalent) when
  a last-open board exists for the active campaign.
- Empty / missing data degrades gracefully (no fake placeholders that look like content).
- Switching campaigns updates the cue; cue opens/switches to that board.
- No new Campaign mode or dashboard page.

## Non-goals

- New Campaign mode or hub page
- Session timeline / activity feed / “last surface” arbitration in v1
- Auto-opening last board on every cold load (cue is explicit continue)
- Storing new heavy state beyond existing keys

## Primary files

- `app.template.html` — CAMPAIGN header / picker + BOARD lastOpen

## As implemented

**BOARD API.** `bg.board.lastOpen.v1` was read and written only by the private
`lastOpenFor` / `rememberLast` pair, so the cue needed two public calls rather than a peek
into storage from CAMPAIGN:

- `BOARD.lastOpen()` → `{ id, title }` for the **active campaign** or `null`. It resolves
  the pointer against that campaign's boards; a pointer that no longer resolves is
  **cleared** (new `forgetLast`, which also backs `dropCampaignBoards`) and `null` returned.
  So a deleted board — or one imported under another campaign — cannot produce a cue naming
  it, and the stale key does not linger. A board with a blank title reads `Session`.
- `BOARD.openBoard(id)` → `{ ok, title }` / `{ ok: false, error }`. Rejects an id outside
  the active campaign, otherwise sets `activeBoardId`, writes the pointer, persists, and
  presents: it re-renders in place when Board mode is already active and otherwise calls
  `TRK.setMode("board")` once, letting the existing `setActive(true)` path hydrate. Nothing
  re-enters `setActive` when Board is already on screen.

**Cue.** `CAMPAIGN.renderResumeCue()` owns the `#hdrResume` chip inside `#hdrCamp` and is
called from `renderHeader`, so every campaign create / switch / rename / delete refreshes
it; BOARD calls it back (guarded, same as its other `window.CAMPAIGN` reads) from
`rememberLast` and from a board rename, which are the only two ways the id or the title can
change. The chip is `hidden` with cleared text and `data-board` when there is nothing to
resume — no placeholder — and its label ellipsises, since session titles are free text.
A click that loses the race with a deletion re-renders the cue and announces the reason
instead of failing silently.

**No auto-open.** Nothing calls `openBoard` on load; the pointer is only read to label the
chip. Maps' own `bg.maps.lastOpen.v1` is untouched — there is no “most recent surface”
arbitration and no new mode.

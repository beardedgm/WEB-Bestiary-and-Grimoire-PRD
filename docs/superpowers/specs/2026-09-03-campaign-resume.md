# P5 — Resume Board — 2026-09-03

**Status:** Stub (revised). Implementation not started.
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

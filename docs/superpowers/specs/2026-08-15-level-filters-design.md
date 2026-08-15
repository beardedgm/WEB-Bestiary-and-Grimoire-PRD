# Level, CR and rank range filters

**Date:** 2026-08-15
**Component:** `app.template.html` (rebuilt into `index.html` by `build_bundles.py`)

## Problem

The browser filters by content type, game system, and a few spell properties. It
cannot narrow by power tier, which is the question a GM actually asks: *show me
5e monsters around CR 6*, *Pathfinder creatures for a level 4 party*, *rank 3
spells*.

The naive fix — one "level" slider across all 9,339 records — would misrepresent
the data. The corpus carries four separate numeric scales:

| Scale | Records | Stops | Range |
|---|---:|---:|---|
| 5e CR | 3,141 | 32 | `0`, `1/8`, `1/4`, `1/2`, `1` … `30` |
| PF2e creature level | 2,598 | 27 | `-1` … `25` |
| 5e spell level | 1,542 | 10 | `0` … `9` |
| PF2e spell rank | 2,058 | 10 | `1` … `10` (rank **and** focus) |

CR and creature level are not the same measurement and do not even share
endpoints. README §13 states the rule this design follows: *"`challenge.value`
is not comparable across systems. CR 15 ≠ Creature 15."*

## Design

### Four scales, four independent controls

Each scale gets its own from/to pair of native `<select>` elements. A record is
tested **only** against the control for its own scale. A record whose scale has
no active range passes through. CR and creature level therefore never interact.

PF2e focus spells (617 records, `level.kind === "focus"`) share the PF2e rank
control: they are numbered 1–10 exactly as ranks are, and the existing `FOCUS`
chip already isolates them as a category. This avoids a fifth control.

### Controls appear only when their scale is in play

Four controls at once would swamp a 340px sidebar. A control renders only when
records on its scale are present in the current result set. Selecting
`MONSTERS` + `D&D 5E` shows one control, not four.

**Visibility is computed from the other filters only, with the range filters
excluded.** If visibility were computed from the final result set, a range that
matched nothing would hide its own control and leave the user unable to widen
it again.

### Options are read from the data

Each scale's stops are collected by scanning loaded records for distinct values,
not hardcoded. A future sourcebook adding CR 31 extends the control with no code
change.

Labels come from the record's own display text where one exists: CR shows `1/8`
and `1/2` rather than `0.125` and `0.5`. The other three scales label with the
bare integer, because `challenge.display` for PF2e is `"Creature 9"` and the
control is already titled with its scale.

### Interaction

- Both selects default to the scale's full extent, which means inactive.
- Choosing a `from` above the current `to` raises `to` to match; choosing a `to`
  below `from` lowers `from` to match. An empty range cannot be created by
  accident.
- A record whose value is `null` passes. No such record exists today (0 nulls
  across all four scales) but the filter must not depend on that.

### Cantrips need no special case

5e cantrips are level 0 and sort in naturally. PF2e cantrips carry real ranks —
of 147, they sit at ranks 1, 2, 3, 5 and 7 — so a rank 3 filter correctly
includes the rank 3 ones. README §13 warns against testing `level.value === 0`
for cantrips; this design never does, because it filters on the scale value
alone and leaves the cantrip question to the existing `CANTRIPS` chip.

## Code shape

A single `SCALES` table drives filtering, control construction and visibility.
Each entry declares:

| Field | Purpose |
|---|---|
| `key` | filter-state key |
| `label` | control heading, e.g. `D&D 5E · CR` |
| `applies(r)` | whether this scale governs a record |
| `valueOf(r)` | the record's numeric position on the scale |
| `labelOf(r)` | display text for that value |

Consumers:

- `passRange(r)` — find the applicable scale; pass if none or inactive.
- `buildRangeControls()` — collect distinct values per scale, populate selects.
- `updateRangeVisibility(base)` — show or hide each control from `base`, the
  result set filtered by everything except ranges.

Range state joins the existing `F` object as `F.range[key] = {from, to}`.
Adding a scale later is one table entry, not four edits.

## Visual treatment

Control headings use the existing mono uppercase micro-type shared by the filter
chips and stat-block section heads. Selects take the hairline border, stone
background and 2px radius already used by `.chip`, with the numbers in mono.
The block sits below the existing chip rows and above the
*also search description text* toggle.

No new colour enters the palette. The from/to pair stays on one line within the
340px sidebar, and under the existing 760px breakpoint the sidebar becomes a
full-width band above the reading pane, where the controls have more room, not
less.

## Verification

The repo has no test harness, so verification is a count cross-check: compute
expected totals in Python directly from the bundles, then drive the UI in the
browser and assert the displayed count matches.

Baselines computed from the current corpus:

| Query | Expected |
|---|---:|
| 5e monsters, CR 5–8 | 737 |
| PF2e creatures, level 3–6 | 670 |
| PF2e spells, rank 3 (incl. focus) | 274 |

Also confirm:

- A CR range leaves PF2e creature counts untouched, and the reverse.
- Setting a range that matches nothing still shows its control, so it can be undone.
- Controls hide and reappear correctly as kind/system chips change.
- Both paper stocks still render; mobile layout holds at 375px.
- `python build_bundles.py --check` passes, and the four build anchors survive.

## Out of scope

- Persisting filter state across reloads. Nothing else in the app persists.
- Cross-system level comparison or any CR→level approximation. README §13 is
  explicit that any such mapping is the consumer's approximation to own.
- Filtering by any other numeric field (AC, HP, DC). Same pattern would apply if
  wanted later, which is why `SCALES` is a table.

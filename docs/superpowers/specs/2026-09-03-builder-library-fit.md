# P3 — Builder remaining → Library fit — 2026-09-03

**Status:** Stub (revised). Implementation not started.
**Roadmap:** [`../plans/2026-09-03-connected-improvements-roadmap.md`](../plans/2026-09-03-connected-improvements-roadmap.md)
**Depends on:** P1 recommended (shared verbs / Library chrome)

## Problem

While building an encounter, answering “what if I add one more?” requires mental math against
the budget meter. The Library does not surface creatures that still fit.

## Metric

Time to answer “what if I add one more?”

## Hard rule (locked)

**Fits remaining uses simulated Builder results, never independent Library XP arithmetic.**

```text
candidate fits
    ↓
simulate current draft + one of that creature
    ↓
run normal Builder spend math (spendSummary / same path)
    ↓
new spent <= target budget
```

Independent `creature XP <= remaining XP` is **wrong** for 5e 2014 (encounter multiplier
depends on full monster count) and wrongly treats PF2e outside-±4 creatures as free fits
(Builder prices them 0 XP / unpriced with “Outside ±4”).

Expose as `BUILD.fits(ref)` (or equivalent) used by the Library chip/filter.

## Acceptance criteria

- When `body.build`, Library chip **Fits remaining** calls `BUILD.fits(ref)` simulation.
- One rule covers PF2e, 5e 2014, and 5e 2024 via existing Builder math.
- PF2e outside-±4 / unpriced creatures do **not** pass as free fits.
- System-locked roster rules unchanged (no cross-system mixing).
- Chip off or leaving Builder clears or hides the fit filter appropriately.

## Non-goals

- CR↔level conversion
- Changing budget formulas
- Auto-adding monsters to the roster from the filter
- Deep Library redesign beyond the fit chip/filter

## Primary files

- `app.template.html` — BUILD (`spendSummary`, `lineCost`, `dnd2014Multiplier`, …) + Library filters / chips

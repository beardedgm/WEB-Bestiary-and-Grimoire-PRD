# P3 — Builder remaining → Library fit — 2026-09-03

**Status:** Stub (revised). Implementation not started.
**Roadmap:** [`../plans/2026-09-03-connected-improvements-roadmap.md`](../plans/2026-09-03-connected-improvements-roadmap.md)
**Depends on:** P1 recommended (shared verbs / Library chrome)
**Amended 2026-09-03:** a plan review against the code found two gaps — the Builder math the
flow below calls into cannot be invoked on a hypothetical draft as written, and a filter over
the Library runs on the search hot path. Both are now scoped as P3 work rather than left to
be discovered during implementation.

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

## Required refactor (P3 work, not incidental)

The flow above cannot be run as written. `spendSummary()` (`app.template.html`) takes no
arguments and reads the module-scoped `draft` directly — `draft.lines`, `.ruleset`,
`.partySize`, `.partyLevel` — and `budgetFor(draft)` takes the live draft object. `BUILD`'s
public surface is `{ setActive, tryAdd, openPreset, draftSystem, render }`; `lineCost`,
`budgetFor` and the classifiers are exposed only under `_test`.

So P3 must first make the spend math callable on a hypothetical state:

- Give `spendSummary` (and `budgetFor`) an explicit state parameter, defaulting to the live
  `draft` so existing call sites are unchanged.
- Add the public entry point on `BUILD`; do **not** widen `_test` into the app's API surface.
- **Do not** simulate by mutating `draft`, calling, and restoring. A throw inside `lineCost`
  would leave the live draft holding a phantom line, and `saveDraft()`/`render()` run off the
  same object.

## Cost budget

`refresh()` filters the whole corpus (`DATA.filter(…)`, 9,339 records) on every keystroke and
every filter change; `CAP = 400` bounds what is *rendered*, not what is *evaluated*. In
Builder mode the list is already system-scoped, so a fit predicate still faces ~2,600–3,100
monsters per keystroke. A naive `BUILD.fits(ref)` that re-runs `spendSummary()` per candidate
is O(records × draft lines) on the search hot path.

The math decomposes, so this is avoidable:

- Per refresh, compute the draft's `base` and `monsters` **once** — that is the only part
  that walks `draft.lines`.
- Per candidate: one `lineCost(ref, 1)`, then `base + total` / `monsters + 1` through the
  existing multiplier and classifier, compared against a budget computed once.

That is O(records + lines). Shape the API so the per-refresh half cannot accidentally land
inside the per-candidate loop — e.g. `BUILD.fitContext()` returning a context whose
`fits(ref)` is O(1) — rather than a bare `BUILD.fits(ref)` that recomputes everything.

**Fits remaining is a filter chip** (it narrows the list, like the existing Custom filter),
not a per-row badge. That is precisely why the budget above is binding.

## Acceptance criteria

- When `body.build`, Library chip **Fits remaining** calls `BUILD.fits(ref)` simulation.
- One rule covers PF2e, 5e 2014, and 5e 2024 via existing Builder math.
- PF2e outside-±4 / unpriced creatures do **not** pass as free fits.
- System-locked roster rules unchanged (no cross-system mixing).
- Chip off or leaving Builder clears or hides the fit filter appropriately.
- `spendSummary` / `budgetFor` accept an explicit state; the live `draft` is never mutated to
  simulate a candidate.
- Per-refresh work is computed once, not per candidate; typing in `#q` with the chip on stays
  responsive against a full system-scoped monster list.
- The new entry point is a real `BUILD` method, not a promoted `_test` export.

## Non-goals

- CR↔level conversion
- Changing budget formulas
- Auto-adding monsters to the roster from the filter
- Deep Library redesign beyond the fit chip/filter
- Promoting `_test` wholesale into the public API

## Primary files

- `app.template.html` — BUILD (`spendSummary`, `lineCost`, `dnd2014Multiplier`, …) + Library filters / chips

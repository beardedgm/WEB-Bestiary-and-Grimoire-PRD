# Encounter Builder mode (2026-08-24)

## Goal

Add a fifth app mode, **Builder**, that computes PF2e / 5e 2014 / 5e 2024 encounter budgets from party size + shared level, assembles a monster roster from the corpus, and saves into existing Table → Encounters presets (with round-trip `builder` metadata) plus Load into Tracker now.

## Locked decisions

- Header chip **Builder** (after Board): Library | Tracker | Board | Builder
- Rules: **PF2e**, **5e 2014**, **5e 2024** (GM picks; never mix systems in one build)
- Party: **size + one shared level** only
- Exits: **Save to Encounters** and **Load into Tracker now**
- Round-trip: reopen a saved Encounter in Builder
- PF2e creature outside party level ±4: **block**
- Missing HP / incomplete combatant fields: **block add** with a clear status message

Out of v1: adventuring-day XP, situational ±1, mixed PC levels, auto-fill remaining budget, cross-system comparison.

## Architecture

- Mode: `body.build` / `ui.mode === "build"`; `#builder` occupies the tracker column slot; `#trk` hidden
- New **`BUILD`** IIFE → `window.BUILD` between `TRK` and `BOARD`
- Draft: `bg.builder.v1` via `vBuilder`
- Presets: optional `builder: { system, ruleset, partySize, partyLevel, threat, lines }` via `vBuilderMeta` / `vPresets`
- Pure budget helpers exposed on `BUILD._test`

## Implementation notes

- Catalog `+` in build mode calls `BUILD.tryAdd(ref)` (qty 1–20 independent of Tracker `#qty`)
- Table → Encounters: **Builder** chip + pane **Open in Builder**
- `TRK.savePresetFull` / `replaceEncounter` / `getPreset` bridge Save / Load
- Docs: `PRODUCT.md`, `DESIGN.md`, `CLAUDE.md`

## Manual acceptance

- PF2e: 4×L5 Severe → budget 120; PL+2 (80) + two PL−2 (20) = 120; PL+5 blocked
- 5e 2014: 4×L3 Medium thresholds; 2 monsters apply ×1.5; difficulty label correct
- 5e 2024: 5×L5 Moderate = 3750; spend without multiplier
- System switch with roster asks confirm; wrong-system catalog add blocked
- Monster with null HP cannot add; message shown
- Save appears under Table → Encounters; Load replaces Tracker; Open in Builder restores size/level/threat/lines
- Export portable save round-trips `builder` on presets
- Mobile ≤760px: Builder usable (stack like Tracker)

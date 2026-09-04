# P7 — Forge roles / band-first UI — 2026-09-03

**Status:** Stub (revised). Implementation not started.
**Roadmap:** [`../plans/2026-09-03-connected-improvements-roadmap.md`](../plans/2026-09-03-connected-improvements-roadmap.md)
**Ship order:** Before P6 (improves existing Forge without reopening Maps scope).
**Amended 2026-09-03:** a plan review found the `wisGuess` note below was understating a
live data-model violation. It is promoted from "examine when implementing" to a hard rule
with its own acceptance criterion — P7 is the only phase that touches this code, and role
presets would otherwise be layered on fabricated ability mods.

## Problem

Forging a “level-8 undead brute” (or 5e CR equivalent intent) starts from numbers, not role
bands. PF2e damage-band selection mostly influences the damage benchmark while other values
come from the level row. Intent is secondary; time-to-usable-block is slower than a
band-first / role-preset flow.

## Metric

Time from “level-8 undead brute” (or clear CR/role intent) to a usable custom block.

## Approach (locked)

Role presets as Extreme / High / Moderate / Low distributions across HP, AC, saves, attack,
damage (e.g. Brute vs Skirmisher). Intent chips primary; numeric fields secondary but
editable. Changes Forge from benchmark calculator toward **creature designer**.

5e path translated carefully — no fake PF2e identity on 5e records (`challenge.kind` stays
honest; no CR↔level conversion).

## Hard rule (locked): stop fabricating PF2e ability mods

The PF2e Forge branch in `app.template.html` emits

```js
const wisGuess = Math.max(-5, Math.min(10, f.perception - 3));
// …
abilityMods: { str: 0, dex: 0, con: 0, int: 0, wis: wisGuess, cha: 0 },
abilityScores: null,
```

Every one of those values is invented. The GM never entered them, and the PF2e level
benchmarks the form is built on do not state them — `parse.warnings` even says so
("Forged from level benchmarks; ability scores unstated") while the record claims six
concrete modifiers anyway.

This violates the core invariant in `README.md` / `CLAUDE.md`: **`null` means "the source did
not state this" — never a default, never zero; never compute a value the source didn't
state.** `monster.schema.json` types `abilityMods` as `["object", "null"]`, so emitting
`null` validates today — the zeros are a choice, not a schema constraint.

- PF2e forged records set `abilityMods: null` unless the GM actually supplies mods.
- If role presets give the GM a way to state them, they are real input and may be written.
- The **5e branch is already honest** and must stay that way: it derives `abilityMods` from
  the `f.scores` the GM typed (`abMod(scores[k])`) and keeps `abilityScores` alongside.
  This rule is PF2e-only.

## Acceptance criteria

- Role presets apply coherent band distributions; GM can deviate afterward.
- Intent chips are the primary control; numbers remain editable.
- Save to Custom still lands valid schema records for both systems.
- PF2e forged records no longer carry invented `abilityMods`; unstated means `null`.
- Anything a role preset writes is a value the GM chose, not one derived from another
  benchmark (no second `wisGuess`).
- 5e records keep GM-entered scores and their derived mods.
- No CR↔level conversion or cross-system power math.

## Non-goals

- CR↔level conversion
- Replacing the full Forge form with a wizard that hides systemExtras
- Auto-balancing against Builder budget

## Primary files

- `app.template.html` — FORGE (tables already inlined)

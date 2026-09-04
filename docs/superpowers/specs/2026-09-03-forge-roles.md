# P7 — Forge roles / band-first UI — 2026-09-03

**Status:** Stub (revised). Implementation not started.
**Roadmap:** [`../plans/2026-09-03-connected-improvements-roadmap.md`](../plans/2026-09-03-connected-improvements-roadmap.md)
**Ship order:** Before P6 (improves existing Forge without reopening Maps scope).

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

Examine synthesized fields such as PF2e `wisGuess` when implementing — not a blocker.

5e path translated carefully — no fake PF2e identity on 5e records (`challenge.kind` stays
honest; no CR↔level conversion).

## Acceptance criteria

- Role presets apply coherent band distributions; GM can deviate afterward.
- Intent chips are the primary control; numbers remain editable.
- Save to Custom still lands valid schema records for both systems.
- No CR↔level conversion or cross-system power math.

## Non-goals

- CR↔level conversion
- Replacing the full Forge form with a wizard that hides systemExtras
- Auto-balancing against Builder budget

## Primary files

- `app.template.html` — FORGE (tables already inlined)

# P7 — Forge roles / band-first UI — 2026-09-03

**Status:** Implemented 2026-09-03.
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

## What shipped

**Bands are rungs relative to the benchmark row, and the row is the Moderate rung.** That is
the decision the rest follows from: a Balanced creature is byte-for-byte what the Forge
produced before P7, so the change adds intent rather than moving everyone's numbers. The
offsets between rungs (`PF_STEP` / `D5_STEP`) are the Forge's own spacing, stated as such in
the code — they are not a reproduction of a book table, and every number they produce lands
in an editable field before it reaches a record.

**Roles.** Seven chips — Balanced, Brute, Soldier, Skirmisher, Sniper, Caster, Mook — each a
distribution over `hp`, `ac`, `fort`, `ref`, `will`, `per`, `attack`, `damage`, `spellDC`,
plus (5e only) the primary/secondary ability pair fed to `suggestAbilities`.

**Band strip.** Under the chips, one button per stat the active system actually has (four on
5e, nine on PF2e), cycling Extreme → High → Moderate → Low. Cycling re-applies benchmarks
when the form is already applied, so the numbers follow the bands live. A distribution that
no longer matches any role drops the chip and reads "Custom mix — bands set by hand", which
is how "GM can deviate afterward" is visible rather than implied. The PF2e **Damage band**
`<select>` was removed; the strip owns that value and maps the inlined rows' older
Low/Moderate/Severe/Extreme columns onto the four rungs, Severe being what High reads.

**5e translation.** HP moves inside the range the CR row already states (`hpMin` … `hp` …
midpoint … `hpMax`) rather than being scaled; damage rescaling moves only the flat bonus so
the row's dice survive; AC and attack take flat offsets. `challenge.kind` stays `cr`, no
PF2e-shaped fields appear, and nothing converts between CR and level.

**The hard rule.** `wisGuess` is gone and PF2e forged records emit `abilityMods: null`
alongside the existing `abilityScores: null`; the `parse` warning now says "ability
modifiers and scores unstated". `monsterHTML` already guarded on `r.abilityMods`, so a
forged PF2e block simply prints no ability row. `validateCustomRecord` had to be relaxed to
match the schema it was supposedly enforcing — it rejected null outright — so it now accepts
null while still rejecting a *partly* filled object. The 5e branch was untouched.

Forge writes `systemExtras.forgeRole` and `systemExtras.forgeBands` on both systems: those
are the GM's stated intent, not a value derived from another benchmark.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Rebuild the four bundles + index.html from the sidecar JSON (the normal build)
python3 build_bundles.py

# Verify committed artifacts are current — exits non-zero and names stale files.
# ~3s over all 9,346 sidecars. This is the CI gate; run it before every commit.
python3 build_bundles.py --check

# Bundles only, leave index.html alone
python3 build_bundles.py --no-page

# Regenerate sidecar JSON from markdown (only when markdown under monsters/ or spells/ changed)
python3 convert_monsters.py
python3 convert_spells.py

# UI work without rebuilding 5.6 MB on every change: serve and open the TEMPLATE,
# which falls back to fetching the four bundles instead of using embedded data.
python3 -m http.server 8000    # → http://localhost:8000/app.template.html
```

There is no test suite and no linter. CI (`.github/workflows/ci.yml`) runs `py_compile` on
the three Python scripts plus `build_bundles.py --check`. Verification of app behaviour is
manual in the browser; `TRK._test` exposes the pure validators (`vEnc`, `vParty`, `vUi`,
`autoName`, `hpClass`, `midInit`, `badgeOf`, `scalePd`) for console checks.

## Generated files

`index.html` (5.6 MB) and `monsters-{5e,pf2e}.json` / `spells-{5e,pf2e}.json` are **build
artifacts**. `index.html` is the file GitHub Pages serves and the one that looks like the
app, but `build_bundles.py` overwrites it wholesale from the template on every build.

- Edit **`app.template.html`** — markup, CSS and JS with no data in it.
- Edit the markdown + sidecar JSON under `monsters/` and `spells/` for data.
- Directories under `monsters/<system>/` and `spells/<system>/` starting with `_` are
  scratch space; the converters and the build both skip them.

`build_bundles.py` splices into the template at three exact anchor strings via `_sub_once`:
the `<p id="lmsg">Loading data files…</p>` line, the
`<div id="dpop" hidden></div>\n\n<script>\n"use strict";` boundary, and `async function boot(){`.
Each must appear exactly once. Changing any of them fails the build with a named error
telling you to update `build_bundles.py` — heed it rather than working around it.

## Architecture

One HTML file, no framework, no dependencies. `app.template.html` holds three sequential
`<script>` blocks:

| Block | Scope |
|---|---|
| 1 (`~1271–2835`) | Corpus load, custom library, portable save, filters/`SCALES`, search, stat-block + spell rendering, spell peek |
| `TRK` (`~2843–4725`) | Initiative tracker, dice, party/presets, player display, undo ring, column resize |
| `BOARD` (`~4731–6088`) | Session boards: markdown / image / audio / counter / dice / timer / checklist / random cards |

**Module boundary.** `TRK` and `BOARD` are IIFEs assigned to `window.TRK` / `window.BOARD`
at the end of their block (`const` bindings don't become window properties). Script 1 guards
every cross-module call with `if (window.TRK)` so each block stays independently removable.
Script 1 publishes `window.refresh`, `window.setSide`, `window.openSpellPeek`, etc. for the
same reason. Keep new cross-module calls guarded.

**Loading.** `boot()` in the built page tries `tryEmbedded()` first (gunzip the inlined
base64 payloads via `DecompressionStream`); the template's own path is `tryFetch()` over the
four bundle files, with a file-drop fallback. All four packs must arrive before `start()` runs.

**Persistence.** Everything is `localStorage`, local-only, no server or sync. Stored data is
treated as untrusted (hand-edited, older schema, truncated write): every read goes through a
`v*` validator (`vEnc`, `vParty`, `vPresets`, `vDice`, `vUi`, `vPd`, `vMarkers`,
`vCustomRecords`) that copies and clamps recognised fields and drops everything else. Follow
that pattern for any new persisted state, and never re-sort arrays whose order carries user
intent (combatant tie order). Keys: `bg.trk.{enc,party,presets,dice,ui,pd}.v1`,
`bg.custom.records.v1`, `bg.board.v1`. The portable export is `bg-user-save/1`, merged by id
(local kept on conflict for non-encounter data; the encounter is replaced after confirmation).

**Per-system rules live in one place.** `initModOf()` is the only place the initiative rule
branches: PF2e rolls on Perception, 5e on DEX, except 2025-SRD monsters which print
`systemExtras.initiative`. Same for `acOf` / `hpOf`.

## Data model invariants

`README.md` is the spec; these are the rules that break the dataset if violated.

- **Differences are values, never keys.** Every monster record has the same 20 top-level
  keys, every spell the same 22; both schemas set `additionalProperties: false`.
- **`null` means "the source did not state this"** — never a default, never zero. Never
  compute a value the source didn't state (this is why `abilityScores`, `save.dc`, and
  PF2e `damage[].average` are null).
- **`kind` discriminators mark non-comparable values**: `challenge.kind` (`cr` vs `level`),
  `level.kind` (`level`/`rank`/`focus`), `recharge.kind`, `heightening[].kind`. There is
  deliberately no CR-to-level conversion or cross-system power comparison.
- **`systemExtras` is the only open object** — one-system concepts go there and nowhere else.
- **`entries` stays faithful prose**; structured fields ride alongside it, never replace it.
- **Key on `id`, not name** — 793 spell names and 387 monster names repeat across books.
- `save.basic: true` means the canonical `none/half/full/double` ladder you can compute on;
  `false` means effect text in the source's own words that you only render.
- `parse.status` (`ok` / `partial` / `failed`) is the honesty layer; surface warnings, don't
  hide incomplete conversions.
- The `SCALES` array in the app assumes its four predicates are **mutually exclusive**
  (`scaleFor` is first-match-wins, but `buildRangeControls` and `updateRangeVisibility` test
  each entry independently). A new overlapping scale must be inserted before the broader
  entry it overlaps.

## UI conventions

`DESIGN.md` carries the full system. The rules that are easy to violate accidentally:

- Overlays (`#trkovl`, `#pdisp`, `#dpop`, `#boardExpand`, `#spellpeek`) live **outside
  `<main>`** so `setAppInert()` doesn't make them unclickable. Spell peek deliberately does
  *not* set `inert` — library search and the tracker must stay usable underneath it.
- Destructive actions use the inline `TRK.confirmSwap` pattern — never `window.confirm`
  or `prompt`.
- Gilt (`--gilt`) may outline, focus, or underline; it must never carry readable text
  (fails 4.5:1 on paper and stone).
- Chips are the universal control primitive; use `aria-pressed` so state isn't colour alone.
- Adding a new type size requires adding it to the `DESIGN.md` table **and** its frontmatter
  before using it in CSS.
- 44px minimum targets on coarse pointers for tracker damage/heal/remove, catalog add, and
  Board card ops.

## Documentation map

Keep these current in the same change that alters the behaviour they describe:

- `README.md` — the data model, schema reasoning, `parse` semantics, §13 traps, regeneration.
- `PRODUCT.md` — scope, users, capabilities/constraints, localStorage keys, terminology.
- `DESIGN.md` — design tokens (YAML frontmatter) and the named visual rules.
- `docs/superpowers/{specs,plans}/` — dated design specs and implementation plans for
  shipped features; the precedent for how substantial work is planned here.
- `docs/mockups/*.html` — standalone comparison fixtures, not app code.

## Content licensing

The corpus is converted from open-licensed material only (SRD 5.1/5.2, Pathfinder OGL/ORC,
and open third-party books). Non-open content is absent by design. `variant` and `source` on
every record identify the book — check each book's terms before redistributing.

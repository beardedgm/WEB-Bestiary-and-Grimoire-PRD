# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Rebuild the four bundles + index.html from the sidecar JSON (the normal build)
python3 build_bundles.py

# Verify committed artifacts are current — exits non-zero and names stale files.
# ~3s over all 9,346 sidecars. This is the CI gate; run it before every commit.
python3 build_bundles.py --check

# Validate every record in the four bundles against monster/spell JSON Schemas (CI)
python3 validate_schemas.py

# Syntax-check every inline <script> in app.template.html (needs node)
python3 check_inline_scripts.py

# The external scripts are not covered by CI — check them by hand after editing them
node --check lib/board-zip.js maps/maps-app.js

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
the Python scripts, `build_bundles.py --check`, `validate_schemas.py` (pinned
`jsonschema`, including cross-bundle record-id uniqueness), and
`check_inline_scripts.py` (`node --check` on each inline script). Verification of app behaviour is
manual in the browser; `TRK._test` exposes the pure validators (`vEnc`, `vParty`, `vUi`,
`autoName`, `hpClass`, `midInit`, `badgeOf`, `scalePd`, `evtLine`, `nextIdOf`) and `BUILD._test` the encounter
budget helpers (`pf2eBudget`, `dnd2014Multiplier`, `dnd2024Budget`, …) for console checks.

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

One HTML file, no framework, no dependencies. `app.template.html` holds sequential
`<script>` blocks:

| Block | Scope |
|---|---|
| 1 (`~1370–2930`) | Corpus load, custom library, portable save, campaign archive (`bg-campaign-archive/1`: `buildCampaignArchiveAsync` / `readCampaignArchive` / `applyCampaignArchiveAsync` over `BOARD_ZIP` from `lib/board-zip.js`), filters/`SCALES`, search, stat-block + spell rendering, spell peek, object → action chips (`actionsFor` / `mountActionChips`) |
| `TRK` | Initiative tracker, dice, party/presets, player display, undo ring, glance strip (`#trkglance`: Now/Next + ephemeral `events` ring), column resize, mode chrome |
| `CAMPAIGN` | Campaign container: `bg.campaign.v1` (party, presets, lore pages, maps meta); header picker + `renderResumeCue` (`#hdrResume`); one-shot migration from lore/party/presets; portable `campaigns` bag |
| `BUILD` | Encounter Builder: draft `bg.builder.v1`, PF2e / 5e 2014 / 5e 2024 budgets, roster, Save/Load bridges, `fitContext` / `fits` behind the Library's **Fits remaining** chip |
| `BOARD` | Session boards / session notes: markdown / image / audio / counter / dice / timer / checklist / random / record / encounter cards (`BOARD.addRecord` / `BOARD.addEncounter`; the Board chip from Library (Script 1 `addSendToBoard`), Table, Builder); `BOARD.lastOpen` / `BOARD.openBoard` back the header's **Continue Board** cue; markdown cards carry the **Copy to Lore…** chip (`startCopyToLore` → `pickLoreParent` → `LORE.createPage`) |
| `FORGE` | Creature forge: inlined 5e CR + PF2e level tables, role chips + band strip (`ROLES` / `BANDS` / `PF_STEP` / `D5_STEP`), dual-system forms, preview via `monsterHTML`, Save to Custom |
| `LORE` | Adventure text UI: module pages for the active campaign (`CAMPAIGN`), nested tree/tags, preview, Board (pin) chip; headless `LORE.createPage` / `LORE.listPages` for other surfaces |
| `MAPS` | Campaign hex maps: `#maps` mode, Pixi editor (`maps/maps-pixi.bundle.js` + `maps/maps-app.js`), IndexedDB `bg-maps`, bundled `maps/starter.hexplora`, HexPlora import/export, optional Library `ref` id on a token (`vRef` in `vToken`; Open / Tracker / Board chips from `actionsFor`); `exportRecords` / `importRecords` / `removeRecords` record bridge for the campaign archive |

**Module boundary.** `TRK`, `CAMPAIGN`, `BUILD`, `BOARD`, `FORGE`, `LORE`, and `MAPS` are IIFEs assigned to `window.TRK` /
`window.CAMPAIGN` / `window.BUILD` / `window.BOARD` / `window.FORGE` / `window.LORE` / `window.MAPS` at the end of their block (`const` bindings don't become
window properties). Script 1 guards every cross-module call with `if (window.TRK)` /
`if (window.BUILD)` so each block stays independently removable.
Script 1 publishes `window.refresh`, `window.setSide`, `window.openSpellPeek`, etc. for the
same reason. Keep new cross-module calls guarded. Surfaces that store a record **id** rather
than a record (a Maps token's `ref`) go through `window.recordRef` / `window.searchRecordRefs`
/ `window.openRecordById`; the first two hand back flat copies, so a reference holder can
never edit `DATA` through the answer. `LORE.listPages` follows the same rule for lore pages,
and `LORE.createPage` is the **single write path** for a new page — headless (no `announce`,
no focus move, `BOARD.addRecord`-style result object), with `newPage` as its UI wrapper, so
the Lore tree's `+` and the Board's **Copy to Lore…** cannot drift apart.

**Loading.** `boot()` in the built page tries `tryEmbedded()` first (gunzip the inlined
base64 payloads via `DecompressionStream`); the template's own path is `tryFetch()` over the
four bundle files, with a file-drop fallback. All four packs must arrive before `start()` runs.

**Persistence.** Everything is `localStorage`, local-only, no server or sync — except the two
rings in `TRK`, which are module-scoped and deliberately die with the page: `hist` (undo) and
`events` (the glance strip's recent-combat lines, declared via the optional second argument
to `mutate(fn, meta)`, never inferred by diffing `hist.past`). Stored data is
treated as untrusted (hand-edited, older schema, truncated write): every read goes through a
`v*` validator (`vEnc`, `vParty`, `vPresets`, `vDice`, `vUi`, `vPd`, `vMarkers`,
`vCustomRecords`, `vUserSaveMeta`, `vArchiveManifest`) that copies and clamps recognised fields and drops everything else. Follow
that pattern for any new persisted state, and never re-sort arrays whose order carries user
intent (combatant tie order). Keys: `bg.trk.{enc,party,presets,dice,ui,pd}.v1`,
`bg.custom.records.v1`, `bg.board.v1` (session boards tagged with `campaignId`; last-open `bg.board.lastOpen.v1`), `bg.builder.v1`, `bg.campaign.v1` (party / presets /
lore pages / maps meta; migrates once from `bg.lore.v1` + `bg.trk.party.v1` +
`bg.trk.presets.v1`). Presets may include optional `builder` metadata (validated by
`vBuilderMeta`). The portable export is `bg-user-save/1`, merged by id (campaigns:
incoming wins same id; local kept for other non-encounter bags; the encounter is replaced
after confirmation). `bg.userSave.meta.v1` records `lastPortableExportAt`, stamped only
after a Download actually reaches the browser and shown in the Save dialog as "Last
downloaded save" — never "backup", since the stamp cannot prove the file still exists.
The campaign archive `bg-campaign-archive/1` is a STORE-only zip (`lib/board-zip.js`)
holding that same bag as `save.json` — still under the 8 MB rule — plus
`board-media/<n>.<ext>` (image/audio cards' data URLs as files; `src` becomes the path with
the mime stashed on `_mime`) and `maps/m<n>.json` + `maps/m<n>.<ext>` (the `bg-maps` record
with its blob as a file; the sidecar carries the id, which never becomes a file name). Import
re-inlines board media **before** any validator sees the bag (`mediaSrc` admits only
`data:` URLs), writes map blobs through `MAPS.importRecords` **before**
`applyUserSaveBagAsync` (the campaign merge reopens Maps from whatever is stored at that
instant), and treats the map phase as all-or-nothing with rollback. Both downloads stamp
`lastPortableExportAt`.

**Encounter spend math is one path.** `rosterTotals` → `spendOf` → `budgetFor` in `BUILD`,
each taking the state to price and defaulting to the live `draft`. The budget meter and the
Library's **Fits remaining** filter both run it. Never answer "does this fit?" with
`creature XP <= remaining` — that drops the 5e 2014 encounter multiplier and treats PF2e
outside-±4 creatures (priced 0 XP, "Outside ±4") as free. Simulate on a state you built,
never by mutating and restoring `draft`.

**Per-system rules live in one place.** `initModOf()` is the only place the initiative rule
branches: PF2e rolls on Perception, 5e on DEX, except 2025-SRD monsters which print
`systemExtras.initiative`. Same for `acOf` / `hpOf`.

**Forge bands are rungs off the benchmark row, and the row is Moderate.** A Balanced
creature is exactly what the Forge produced before roles existed; `PF_STEP` / `D5_STEP` are
the Forge's own spacing between rungs, not a book table, and everything they compute lands
in an editable field the GM signs off on before it reaches a record. That is the only reason
role output may be written at all. Forged **PF2e** records carry `abilityMods: null` — the
level benchmarks state no modifiers, so neither does the record; never re-derive them from
Perception or any other benchmark. The 5e branch is different because the GM types the
scores. `validateCustomRecord` accepts `abilityMods: null` (matching the schema) but still
rejects a partly filled object.

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
- Object verbs come from `actionsFor` + `mountActionChips` and use the canonical labels
 `Open` / `Board` / `Builder` / `Tracker` — plus `Copy to Lore…` on Board markdown, the one
 label that names its destination because it is the one verb that copies instead of routing
 — never a surface-specific rewording.
  Operations stay owned by their module; the descriptor's `invoke` calls a guarded
  `window.*` API (or, for module-internal subjects, a run function the call site passes in).
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

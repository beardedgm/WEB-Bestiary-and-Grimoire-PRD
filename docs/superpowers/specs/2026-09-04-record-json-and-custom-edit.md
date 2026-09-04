# Library — record JSON view, Edit custom, Edit a copy — 2026-09-04

**Status:** Implemented.
**Roadmap:** outside the P-series — Library follow-up under the backlog roadmap's *Improvement mode*
([`../plans/2026-08-28-backlog-roadmap.md`](../plans/2026-08-28-backlog-roadmap.md)).
**Prior art:** the `+` custom dialog and its "Authoring JSON ≠ stored JSON" contract (`DESIGN.md`,
Custom library dialog).

## Product decision test

**Headline: yes — 7/7, table speed neutral.** A GM who wants "the Lich, but with one different
lair action" used to retype the record into the `+` stub or rebuild it in the Forge; a GM who found
a typo in a custom pasted it into a text editor, re-imported under the same name, and hoped the id
landed on the same string. Edit and Edit a copy collapse both to one dialog seeded with the record's
own JSON, and Edit keeps the id stable so every Board card, Maps token `ref`, Builder roster row and
preset that pointed at it keeps resolving — "I need this" to "I am using it" with less copying and
re-entry.

1. Strengthens prep and the prep→play handoff (references survive edits).
2. Reuses the one custom store; the JSON panel shows the stored record, never a second copy.
3. Ownership clear: the Library owns records; `upsertCustomRecord` stays the single write path.
4. Table speed neutral: one collapsed chip on the meta row, nothing new above the fold.
5. Fidelity: system and kind are locked on Edit; a `gameSystem` change is an error, never coerced;
   plumbing is re-stamped, never invented.
6. Local-first: Copy / Download is the GM's own record leaving as a file they asked for.
7. Simpler than the text-editor round trip it replaces.

## Problem

No record showed its JSON anywhere — the only JSON text in the UI was the built-in Fireball/Lich
stub — and customs could only be viewed as stat blocks and removed. Changing one meant retyping it
whole and confirming "Yes, replace"; renaming it that way changed its id and orphaned every
reference. Forge is write-only into the store and covers only the numeric spine, so it cannot
round-trip a record.

## Approach (locked)

- **The pane injects the controls; the renderers stay pure.** `addPaneMetaControls(r)` builds a
  `.meta-acts` row after `.sb .meta`; `addSendToBoard` mounts the routing verbs (Board) first in that
  same row, so the chip the GM had under the title now sits with every other control on the record.
  `monsterHTML` / `spellHTML` also paint Board cards, the Forge preview and the spell peek, where
  none of these controls may appear. **Remove from library** moved into the row out of `metaHTML`.
  These are Library record-management controls, not `actionsFor` routing verbs.
- **Stored vs authoring JSON.** The panel shows the **stored** record (`stripRuntimeFields`:
  plumbing kept, `_` fields dropped), stringified on first open. The dialog seeds the **authoring**
  form (`toAuthoringStub`), as the `+` stubs do; Save / Import re-stamp plumbing.
- **Native `<details>` disclosure** for the JSON panel (DESIGN's disclosure primitive), summary
  styled as a chip, collapsed on every paint because `fillPane` replaces the sheet.
- **Edit keeps the id.** `normalizeCustomRecord(raw, hintKind, { keepId, kind })`: id, system and
  `source.path` stay what they were whatever the name became; the kind is locked so a stray `level`
  key cannot turn a creature into a spell; a `gameSystem` that disagrees with the kept id is an
  error naming the locked system. Edit never shows the replace prompt — the GM opened it on that
  record, and the same-id upsert also covers "removed meanwhile".
- **Edit a copy** seeds from the record's authoring JSON; a custom source gets " (copy)" appended so
  the default id never overwrites its source; a corpus source keeps its name, since
  `sys:custom:<slug>` can never collide with a corpus id, and the hint asks for a new one.
- **Download** reuses `handOffDownload` (never stamps "Last downloaded save"), filename
  `<id with ':' → '-'>.json`. **Copy** uses the clipboard API with an `execCommand` fallback; the
  sighted cue is the chip flashing "Copied", the spoken one `announceLive`.
- `commitImportedCustom` clears `listSig` before `refresh()` so a rename that keeps its sort
  position repaints the row (the old replace path could show a stale name).

## Acceptance criteria

| Criterion | Acceptance |
|-----------|------------|
| JSON view | Every record's pane shows a **JSON** disclosure; open, `JSON.parse(pre)` deep-equals the stored record with no `_` keys; picking another record collapses it |
| Copy / Download | Copy puts the panel text on the clipboard and flashes "Copied"; Download hands off `<id>.json` whose body parses to the same record |
| Edit | A custom's **Edit** opens the dialog seeded with its authoring JSON; Save writes the same id; the pane, list and Board record cards show the new values |
| Rename on Edit | Name changes, id does not; Board cards and map token refs keep resolving |
| Validation | A missing required key shows the first errors and writes nothing; a changed `gameSystem` shows the locked-system error |
| Edit a copy | A corpus record forks to `sys:custom:<slug>` with the custom spine, the corpus record untouched; a custom forks to `…-copy` with no replace prompt |
| Remove | Still confirms inline and clears the pane |
| Keyboard | Tab reaches JSON, Enter toggles; Escape from the dialog returns focus to the Edit chip; after Save focus lands on the new pane's Edit chip |
| Narrow | At 375px the row wraps, chips are 44px, the `<pre>` scrolls inside the sheet |

## Non-goals

- A form-based editor for customs (the Forge form covers the numeric spine only; JSON is the whole record).
- Editing corpus records in place — fork them with Edit a copy.
- Cross-system coercion on Edit — use Edit a copy for the other system.
- Back-filling Tracker combatants after an edit — combatants are copies taken at add time, by design.
- Batch export of the custom library — the portable save already carries it.

## Primary files

- `app.template.html` — Script 1: `normalizeCustomRecord` / `acceptCustomRecord` / `parseImportPayload`
  (`opts.keepId`, `opts.kind`), `copyText` / `flashLabel`, `addPaneMetaControls`, `openLibDialog(opts)`,
  `commitImportedCustom(v, errEl, opts)`; CSS `.meta-acts`, `.rjson-wrap`, `.rjson`.
- `PRODUCT.md` custom-library bullet; `DESIGN.md` Custom library dialog; `CLAUDE.md` UI conventions.

## Verification

`python3 build_bundles.py --check`, `python3 check_inline_scripts.py`; manual pass over the
acceptance table on the served template (Playwright for clipboard and download events).

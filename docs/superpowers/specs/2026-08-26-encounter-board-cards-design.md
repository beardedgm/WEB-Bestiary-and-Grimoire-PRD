# Encounter Board cards (connected workflow, Phase 2)

Linked Board cards for **saved encounter presets**. Extends Phase 1 (`record` cards)
so prep can pin tonight’s fights onto the DM screen without copying rosters.

Parent: `docs/superpowers/specs/2026-08-26-connected-workflow.md`.

## Problem

A GM builds or saves an encounter in Builder / Table, then rebuilds context on the Board
(notes, images, individual stat blocks). The encounter itself is not pin-able — only
Library records are. That breaks “create once, use everywhere” for the unit of prep
that matters most at session start.

## Decisions (locked)

| Question | Choice |
|---|---|
| What does the card link to? | A **saved encounter preset** (`bg.trk.presets.v1`), not live Tracker state |
| Where is “Send to Board”? | **Table** (preset pane) **and Builder** (saved presets only) |
| Card body | **Roster summary** + Load into Tracker / Open in Builder |
| Combatant click | **Spawn a linked `record` card** via `BOARD.addRecord` |
| Unsaved Builder draft | **Cannot pin** — Save to Encounters first |

## Data model

New Board card type `encounter`, parallel to `record`:

```js
{
  type: "encounter",
  presetId: "<string ≤64>",
  // shared card fields: id, x, y, w, h, z, title, collapsed, expandedH?
}
```

- Source of truth remains the preset store. The card never embeds combatants.
- `vCard`: accept `presetId` via `vStr(..., 64, "")`. Unknown / deleted presets stay
  **valid**; render shows a missing-preset notice (same honesty as missing Library refs).
- Portable save: `{type:"encounter", presetId}` + geometry only.
- Not on the Board add rail — blank refs are meaningless.
- `cardHasSubstance` → `false` (re-creatable; no remove confirmation).

## API

- `BOARD.addEncounter(presetId)` → creates the card on the active board; title from
  preset name when resolvable. Returns `{ ok, name?, error? }`.
- Callers guard: `if (window.BOARD && BOARD.addEncounter)`.
- Preset lookup uses the Tracker presets API already exposed for Table / portable save
  (do not read raw localStorage from BOARD).

## Surfaces

### Table → Encounters

On the preset reading pane (alongside Open in Builder): **Send to Board** chip →
`BOARD.addEncounter(id)` + `announceLive("Added to board: <name>")`. Does not switch modes.

### Builder

**Send to Board** chip next to Load into Tracker / Save.

- Enabled only when the draft is tied to a saved preset id (opened from Table, or just
  saved this session).
- Otherwise disabled with a short hint: “Save to Encounters first.”

### Card body

- Kind label: `encounter`
- Title defaults to preset name (editable like other cards)
- Roster: one row per combatant (name; existing party-vs-monster type cue if available)
- Footer: **Load into Tracker** (reuse existing load path, including empty-Tracker /
  overwrite confirm), **Open in Builder**
- Combatant name click → `BOARD.addRecord(ref)` when a Library id exists; party / manual
  rows without a ref are not clickable
- Pinning and spawning record cards do **not** force a mode switch. Load into Tracker /
  Open in Builder **do** switch modes (intentional handoffs).

## Edge cases

- Missing preset → “Encounter not found — it may have been removed from saved encounters.”
- Combatant with no Library ref → name only, not clickable.
- Library monster deleted under a still-valid preset → spawned `record` card shows the
  existing missing-record notice.
- Duplicate pins of the same preset → allowed.

## Non-goals

- Live Tracker mirroring / HP on the Board card
- Pinning an unsaved Builder draft
- Drag-and-drop from Table onto the Board
- Editing the preset roster from the Board

## Acceptance criteria

1. Pin a saved preset from Table and from Builder → Board shows a roster card.
2. Reload and portable-save round-trip keep `{type:"encounter", presetId}`; deleted
   preset → missing notice; other cards unaffected.
3. Load into Tracker and Open in Builder work from the card.
4. Combatant click spawns a linked record card; dice rolls work on that card.
5. Docs updated: PRODUCT, DESIGN, CLAUDE; workflow-spec integration checklist; plan note.

## Files (expected)

- `app.template.html` — `CARD_TYPES` / `vCard` / `fillEncounter` / `addEncounter`; Table +
  Builder chips; CSS for encounter card body
- `PRODUCT.md`, `DESIGN.md`, `CLAUDE.md`
- `docs/superpowers/specs/2026-08-26-connected-workflow.md` — mark Phase 2 criterion done
  when shipped
- `docs/superpowers/plans/2026-08-26-encounter-board-cards.md` — implementation plan note

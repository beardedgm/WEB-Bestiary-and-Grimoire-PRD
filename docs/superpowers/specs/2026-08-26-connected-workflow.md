# Connected Workflow

Bestiary & Grimoire is a connected operating environment for running tabletop RPG campaigns,
not a collection of DM tools. The problem it solves is fragmentation: monster data in one
place, initiative in another, session notes in a third, encounter math in a fourth. Here,
information is created once and referenced everywhere by record id.

## Principles

1. **Create once. Use it everywhere.** Content has one home and one id; every other surface
   references it. Never copy-paste a stat block between areas.
2. **Everything one or two clicks away.** During a session, any needed piece of information
   is reachable without leaving the app or re-entering data.
3. **Preparation and play are one workflow.** What you build during prep is the same object
   you run at the table — no export/reimport between "prep tools" and "play tools."

These extend, and never override, the existing product principles in `PRODUCT.md`
(system fidelity, one corpus many surfaces, table-speed, local-first, honest data quality).

## Campaign lifecycle

1. Create or import a campaign.
2. Load **adventure text** into **Lore** (chapters, scenes, read-alouds from the module).
3. Reference monsters, spells, and rules in the **Library** (corpus ships built-in;
   customs extend it).
4. Create homebrew material in the **Forge** when the corpus doesn't fit.
5. Build encounters in the **Builder**.
6. Prepare the next session by pulling relevant material onto the **Board** (pin Lore
   scenes, Send to Board from Library / Table / Builder).
7. Run encounters through the **Tracker**.
8. Keep **session notes** on the **Board** (what happened tonight, scratch, timers, handouts).
   Update Lore only when you edit adventure text during prep — not auto-imported from play.
9. Repeat for the next session.

The Library is not a step you finish — it is always available; Forge and import fill gaps
as prep reveals them.

## Area ownership

| Area | Owns | Does NOT own |
|---|---|---|
| **Library** | Reusable game content: corpus monsters/spells + customs, keyed by id | Campaign plot, session layout |
| **Forge** | Creating custom content that lands in the Library | Editing content in place elsewhere |
| **Campaign** | Durable campaign bag (`bg.campaign.v1`): party, encounter presets, Lore pages, maps meta | Live initiative, Board layout, custom library |
| **Maps** | Hex-crawl editor for active campaign (IndexedDB blobs + Pixi); import/export map files | Live initiative, Board handouts, cloud share |
| **Builder** | Encounter drafts and difficulty budgets (Save writes presets into active campaign) | Live combat state |
| **Tracker** | Live encounter: initiative, HP, rounds, markers (party/presets mirror active campaign) | Adventure text, session notes |
| **Board** | Session notes and tonight's spatial layout (`bg.board.v1`; multi-session boards supported) | The adventure manuscript (canonical module text) |
| **Lore** | Adventure/module text for the active campaign (tree of pages: chapters, scenes, read-alouds) | Session log, live initiative; campaign create/rename/delete (header picker) |
| **Export** | Portability — the user owns their files (`bg-user-save/1`, includes `campaigns`) | Cloud identity, sync |

The load-bearing sentence: **Lore is where the adventure text lives; the Board is where
session notes and tonight's table live.** If Lore absorbs session history, or the Board
becomes the canonical module archive, the ownership contract is broken.

## Integration contract

Connections between areas are the product. Each is an acceptance criterion, not a feature
idea. Status as of this writing:

- [x] A monster created in the Forge is saved into the Library (custom store) — *shipped*
- [x] A monster in the Library can be added to an encounter in the Builder — *shipped*
- [x] An encounter from the Builder can be loaded into the Tracker — *shipped*
- [x] A creature's stat block is viewable from the Tracker without leaving the session
      (reading pane) — *shipped*
- [x] A monster or spell in the Library can be sent to the Board as a **linked card**
      (reference by id, live render, not pasted text) — *Phase 1, shipped*
- [x] A saved encounter preset can appear on the Board as a linked card — *Phase 2, shipped*
- [x] A whole Lore page can be pinned to tonight's Board as a linked card — *Phase 3, shipped*
- [x] Board or Tracker → Lore capture automation — *closed / won't do; session notes belong
      on the Board; Lore holds adventure source text*

Linked means: the card stores `{ ref: "<record id>" }` and renders from the live record at
view time. Deleting the underlying custom yields an honest missing-record notice, never a
stale embedded copy (mirrors the `parse.status` honesty philosophy).

## Phased roadmap

Phases 0–3 are **complete**:

- **Phase 0 — Land Forge.** Merge the Forge mode branch (PR #16).
- **Phase 1 — Linked Board cards.** `record` card type on the Board referencing Library
  monsters/spells by id; "Send to Board" from the Library reading pane.
- **Phase 2 — Encounter on the Board.** Saved encounter preset as a linked Board card;
  Load into Tracker / Open in Builder from the card.
- **Phase 3 — Lore v1.** Markdown adventure pages (tree + tags), local-first and portable;
  "Pin to Board" turns a whole Lore page into a linked card.

## Closed non-goals

These were considered and **will not be implemented**:

- Live Tracker mirroring on Board encounter cards (use Tracker for live combat)
- Lore excerpt / read-aloud block pinning (whole-page Pin is shipped; cut/paste to Board if needed)
- Board or Tracker → Lore capture automation (session notes stay on the Board)

## Non-goals

- Becoming a VTT (maps with tokens, fog of war, multiplayer sync)
- Out-templating dedicated worldbuilding tools (heavy template engines, mirrored fields)
- Cross-system power conversion (CR↔level) — unchanged, by design
- Cloud accounts or sync — local-first with portable export remains the trust model
- Live Tracker mirroring on Board encounter cards
- Lore excerpt / read-aloud block pinning
- Board or Tracker → Lore capture automation

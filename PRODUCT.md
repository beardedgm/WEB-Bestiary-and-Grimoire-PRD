# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Single-page application: `app.template.html` (source) → `build_bundles.py` → `index.html` (offline bundle with embedded gzip JSON). Python converters regenerate sidecar JSON from markdown source books. No framework; vanilla HTML/CSS/JS. Deployed as static GitHub Pages (`beardedgm/WEB-Bestiary-and-Grimoire-PRD`).

## Users

**Primary:** Game masters running D&D 5e or Pathfinder 2e at a physical or virtual table who need fast access to monster and spell stat blocks during prep and play.

**Situation:** Mid-session lookup, encounter assembly, initiative tracking, HP management, and dice rolling — often on a laptop beside the table or on a second monitor for players.

## Product Purpose

Bestiary & Grimoire is a browser-based reference, adventure reader, and combat assistant built on a normalized 9,339-record corpus (monsters and spells for both game systems). It lets a GM search and read stat blocks, load adventure text into Lore, add creatures to an encounter, run initiative, track HP, roll dice from stat-block formulas, manage a party roster and saved encounters, and mirror initiative on a player display — all without leaving the browser or sending data off-machine.

Success means a GM can prep and run combat faster than flipping PDFs, with system-accurate data and rules that respect each game's distinct mechanics (no fabricated cross-system conversions), keep module text in Lore, and keep session notes on a local Board without leaving the app.

## Positioning

Unlike generic VTTs or single-system SRD viewers, this product combines **dual-system normalized JSON** (one query model, two games) with an **integrated initiative tracker** fed directly from the same corpus. Monsters added from search carry AC, HP, and initiative modifiers derived from each record's own rules — not hand-entered defaults.

## Operating Context

- **Prep:** Browse Catalog (monsters/spells), filter by system, CR/creature level, rank, spell traits; read full stat blocks in the reading pane.
- **Play:** Switch to Tracker; add monsters from Catalog or party from Table; roll initiative, advance turns, apply damage/healing; click formulas in stat blocks to roll; optional player display window (1920×1080). Switch to Builder to budget a PF2e / 5e 2014 / 5e 2024 encounter from party size + level, then Save to Encounters or hand it to the **Tracker**. Switch to Board for session notes, spatial layout, timers, and tools. Switch to Forge to build a custom 5e or PF2e creature from CR/level benchmarks and Save to Custom. Switch to Lore for adventure/module text (chapters, scenes) organized by page tree and tags; pin a whole scene or chapter to tonight's Board without leaving Lore.
- **Persistence:** Encounter state, dice history, column widths, UI mode, and Builder draft persist in `localStorage` (storage failures are announced and success toasts are not shown when a write fails; portable import reports failure when a write fails). **Campaign** container (`bg.campaign.v1`) owns party, encounter presets, Lore pages, and `maps[]` meta (image blobs + editor state in IndexedDB `bg-maps`). Session boards stay in `bg.board.v1` (large markdown in IndexedDB `bg-board-bodies`) but each board is tagged with `campaignId` so switching campaigns swaps the Board list; untagged local boards stamp onto the active campaign on first load. A one-shot migration folds legacy `bg.lore.v1` / `bg.trk.party.v1` / `bg.trk.presets.v1` into campaigns (default title **My Campaign**). Custom monsters/spells live under `bg.custom.records.v1` (validated on load; invalid rows dropped with notice). Board cards are validated on load/import with trim notices; live autosave does not silently drop in-session cards; running timers persist the displayed value as a stopped baseline; runtime preview cache fields are not persisted. Builder draft under `bg.builder.v1` (global; Save writes presets into the **active** campaign). Encounter presets may carry optional `builder` metadata for round-trip reopen. A portable `bg-user-save/1` JSON export merges customs/campaigns (and mirrors party/presets for older importers — lore rides only inside `campaigns[]`, since a second copy doubled its bytes against the 8 MB cap) and boards by id (local-only kept; incoming campaign wins same id; boards keep `campaignId`) and replaces the active encounter after confirmation; import rejects files over **8 MB**, and export warns when the download would exceed that cap. A successful download stamps `lastPortableExportAt` in `bg.userSave.meta.v1`, which the Save dialog shows as **Last downloaded save** (this device's record of the download, not proof the file survives on disk); a failed build or handoff leaves no stamp. A **campaign archive** (`bg-campaign-archive/1`, `bestiary-grimoire-archive.zip`) bundles that same save as `save.json` (still under the 8 MB rule) with every referenced map image (`bg-maps` blobs, ids preserved) and board image/audio clip as files; the same **Import save…** chip takes either file (zip recognised by signature; **256 MB** cap), merges with identical semantics, writes map blobs before the campaign merge, and rolls them back if nothing else changed.
- **Offline:** `index.html` embeds all four JSON bundles; works from `file://` after build. Development fetch/drop requires all four packs before the app starts (`python3 -m http.server`).
- **Data pipeline:** Markdown sidecars → `convert_monsters.py` / `convert_spells.py` → bundles → `build_bundles.py`.

## Capabilities and Constraints

**Capabilities (confirmed in codebase):**

- Library mode: search, filters, deep description search, stat block rendering with clickable dice formulas
- Monster spellcasting lists: click a known spell name to peek its full block without leaving the creature
- Tracker mode: initiative order, rounds, drag-reorder, undo/redo, party library, encounter presets, dice tray, player display; a **glance strip** above the combatant list names who acts now and who is next and lists the last few things that happened (damage, healing, turns, adds, markers) — in-memory only, ~14 entries, gone on reload, never persisted or exported and never a rules engine
- Builder mode: PF2e / 5e 2014 / 5e 2024 XP budgets from party size + shared level; roster from Catalog (system lock, PF2e ±4 band for XP with outside-band adds at 0 XP labeled **Outside ±4**, missing-HP block); empty 2024 rosters show Difficulty **None** (not Low); Library filter chip **Fits remaining** (Builder mode, monster catalog) narrowing the list to creatures the draft can still afford — decided by simulating the add through the same spend math the meter runs, never by XP-versus-remaining arithmetic, so 2014 multipliers count and PF2e outside-±4 creatures are not free; Save to Encounters with `builder` meta; shared **Tracker** / **Board** action chips (Board enabled once the draft is saved); **Builder** from Table
- Board mode: **session notes** on multi-session spatial boards per **active campaign** (`bg.board.v1`, boards tagged with `campaignId`) with markdown (incl. GFM tables / read-aloud blockquotes; hard size cap enforced in the editor; bodies over 8k chars may live in IndexedDB `bg-board-bodies`), image, audio clip, counter, dice, timer (countdown/stopwatch), checklist, random table, and linked record cards (a Library monster/spell referenced by id, rendered live — the **Board** chip on the reading pane; a removed custom shows a missing-record notice, never a stale copy) and linked encounter cards (a saved Encounter preset referenced by id — roster summary, **Tracker** / **Builder** chips, combatant names spawn record cards; **Board** from Table and from Builder when the draft is saved); board/card caps refuse new adds with a toast; snap-grid drag/resize; portable save includes boards; per-board `.bgboard.zip` export for media-heavy sessions; on narrow viewports the add/session rail opens as a **Cards & sessions** bottom sheet. A markdown card offers **Copy to Lore…** — an explicit, user-initiated one-way copy of title + markdown into a new Lore page under a chosen parent chapter, confirmed inline on the card. The note stays on the Board and nothing syncs afterwards; there is no automatic capture of session notes into Lore
- Forge mode: dual system creature builders (D&D 5e CR 0–30 benchmarks; PF2e creature levels −1…25); **role chips** (Balanced / Brute / Soldier / Skirmisher / Sniper / Caster / Mook) set a band distribution across HP, AC, saves, Perception, attack, damage and spell DC, and a per-stat band strip cycles Extreme → High → Moderate → Low so intent leads and numbers follow (every field stays editable; deviating from a role reads **Custom mix**). Moderate *is* the system's benchmark row, so Balanced is the plain benchmark creature. Live stat-block preview; **Save to Custom** via the existing custom library (replace confirm when id exists); no CR↔level conversion and no cross-system power math. Forged PF2e creatures carry `abilityMods: null` — the level benchmarks state no ability modifiers, so neither does the record
- Campaign context: header picker (New / Rename / Delete) switches the active campaign; party, encounter presets, Lore pages, Maps, and Board sessions swap with it; live encounter/dice stay session-global. A **Continue Board: {title}** cue beside the picker names the last board opened in the active campaign (`bg.board.lastOpen.v1`) and jumps to it; it is an explicit continue, never an auto-open, and hides itself when that board is gone
- Maps mode: hex or square grid editor for the active campaign (PixiJS); background image + grid overlay + fog reveal/hide + tokens (icon — a picker slug with an SVG, or any Material Symbols name carried in from a `.hexplora` file, kept through validation, drawn from the icon font by ligature, shown as "(imported)" in the editor and named in the import toast — + label below disc + notes + optional Library `ref` id, which links a token to a record without copying any monster state onto it and gives it Open / Tracker / Board verbs plus an "on the tracker" readout) + annotations (measure, text, brush, shapes); IndexedDB `bg-maps` for blobs/state; campaign `maps[]` meta only in `bg.campaign.v1` / portable save (map images travel in the campaign archive); native `.hexplora`-compatible import/export; bundled **Starter map** auto-seeded when a campaign has no maps (with procedural fallback); **Reset view** / **PNG** screenshot in the toolbar; rename and delete on each row of the Maps drawer's map list (inline confirm, any map, open or not); no cloud/share
- Lore mode: **adventure/module text** as markdown pages for the **active** campaign (`bg.campaign.v1` → `lore.pages`) — e.g. chapters and scenes from a published adventure — with nested page tree (per-row **Add child**, drag-handle reorder/reparent, Alt+Arrow sibling move and indent/outdent; drag disabled while filtered), tags and filtering; pages with content open in **Preview** (read) by default and **Edit** is opt-in (new/empty pages still open in Edit), with a grouped format chip toolbar for Board-compatible markdown (bold / italic / inline code; H1–H3; bullet and numbered lists; read-aloud quotes; fenced blocks; tables), visible Pin/save toasts, empty-state guidance for the Pin-to-Board loop, and **Board** as the primary editor action (pins the scene/chapter to the table); linked Lore cards render the current page markdown and show an honest missing-page notice after deletion; a Board note can become a page through Board's **Copy to Lore…** (a copy, never a move or a live mirror); portable save includes campaigns; on narrow viewports the page rail opens as a **Pages** bottom sheet
- Ad-hoc colored markers on combatants (five colors, solid/outline) mirrored on the player display — table-ring shorthand, no condition legend
- Catalog vs Table navigation in the left column (monsters/spells vs party/encounters)
- Custom library: content-only authoring JSON in `+` (5e/PF2e Fireball and Lich stubs; plumbing omitted); Import stamps id/schema/source from the chosen system and deep-validates; Custom filter; remove from library; Forge Save to Custom uses the same store
- Portable save: header **Save** downloads/imports merge-safe `bg-user-save/1` (confirm before import; **8 MB** import cap) and **Download archive…** — a `bg-campaign-archive/1` zip of the same save plus map images and board media as files (**256 MB** import cap; **Import save…** accepts either)
- Resizable library and tracker columns
- D&D 5e and PF2e visual differentiation (vellum vs paper, brick vs olive system ink)

**Constraints:**

- No server, auth, or cloud sync — local-only persistence (portable save file is manual export/import)
- Customs cannot overwrite built-in corpus ids; prefer ids like `dnd5e:custom:my-ogre`
- No CR-to-level or cross-system power comparison (by design; see README §13)
- Data must not be fabricated; parse warnings surfaced in UI
- `index.html` is generated — edit `app.template.html` only
- Board media (images/audio) stored as data URLs in localStorage for v1 — large assets can hit quota; use **Download archive…** (media ride as files) or **Export board zip**; portable JSON saves with big media may exceed the 8 MB import limit
- Large Board markdown bodies may live in IndexedDB (`bg-board-bodies`); portable JSON export inlines them
- Maps images and editor state live in IndexedDB (`bg-maps`) — not in the 8 MB portable JSON; the campaign archive carries them, Maps Export covers one map at a time
- Maps is the only mode that loads PixiJS (`maps/maps-pixi.bundle.js`); rebuild with `npm run build:pixi` in `maps/`. Map token icons render via the **Material Symbols Outlined** web font (Google Fonts; network required in Maps mode). SVGs under `maps/token-icons/` are build artifacts from `npm run build:icons` for reference/export; regenerate after changing the icon set.
- Render free-tier hosting constraints apply if deployed to Render (ephemeral FS, bind `0.0.0.0:$PORT` for any future server)

**Terminology:** Catalog, Table, Library, Tracker, Board (session notes), Builder, Forge, Lore (adventure pages / module text), Campaign (owns party / presets / lore / maps meta), Maps, party, encounter preset, threat/difficulty budget, stat block, spine (system color mark on list rows), custom library, user save, counter, random table.

## Brand Commitments

- Product name: **Bestiary & Grimoire**
- Visual world: **The Game Table** — stone chrome, dual paper stocks, book-spine system marks (see `DESIGN.md`)
- Hosted demo: https://beardedgm.github.io/WEB-Bestiary-and-Grimoire-PRD/

## Evidence on Hand

- 9,339 validated JSON records in four bundles (paths in README)
- JSON schemas: `monster.schema.json`, `spell.schema.json`
- Source markdown under `monsters/` and `spells/` with sidecar JSON
- No fabricated testimonials, pricing, or third-party integrations

## Product Principles

These are the operative list. `INTENT.md` explains *why* the product exists and how to judge a
proposed feature against it; it defers to this section for the principles themselves.

1. **System fidelity over convenience** — never merge incompatible scales (CR vs creature level) or invent stats not in the source record.
2. **One corpus, many surfaces** — the JSON is the product; the browser is the reference implementation built on it.
3. **Table-speed interaction** — search, add, roll, and track HP in fewest clicks; keyboard shortcuts for search and combat.
4. **Local-first trust** — campaign data stays in the browser; no account required.
5. **Honest data quality** — surface parse status and warnings; do not hide incomplete conversions.
6. **Create once, use everywhere** — reusable game content lives in the Library keyed by id; adventure source text lives in Lore keyed by campaign/page id; session notes live on the Board; other surfaces reference those sources rather than copying them (see `docs/superpowers/specs/2026-08-26-connected-workflow.md`).

## Accessibility & Inclusion

- Target WCAG 2.1 AA for the Operate UI: keyboard paths, focus management (including Board expand dialog), contrast on tokens, touch targets on coarse pointers; Board mobile uses a Cards & sessions sheet instead of a hidden rail.
- Reduced-motion alternative preserves state without global transition kill.
- Player display is supplementary; core GM workflow must remain keyboard-accessible.

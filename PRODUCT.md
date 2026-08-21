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

Bestiary & Grimoire is a browser-based reference and combat assistant built on a normalized 9,339-record corpus (monsters and spells for both game systems). It lets a GM search and read stat blocks, add creatures to an encounter, run initiative, track HP, roll dice from stat-block formulas, manage a party roster and saved encounters, and mirror initiative on a player display — all without leaving the browser or sending data off-machine.

Success means a GM can prep and run combat faster than flipping PDFs, with system-accurate data and rules that respect each game's distinct mechanics (no fabricated cross-system conversions).

## Positioning

Unlike generic VTTs or single-system SRD viewers, this product combines **dual-system normalized JSON** (one query model, two games) with an **integrated initiative tracker** fed directly from the same corpus. Monsters added from search carry AC, HP, and initiative modifiers derived from each record's own rules — not hand-entered defaults.

## Operating Context

- **Prep:** Browse Catalog (monsters/spells), filter by system, CR/creature level, rank, spell traits; read full stat blocks in the reading pane.
- **Play:** Switch to Tracker; add monsters from Catalog or party from Table; roll initiative, advance turns, apply damage/healing; click formulas in stat blocks to roll; optional player display window (1920×1080).
- **Persistence:** Encounter state, party, saved encounters, dice history, column widths, and UI mode persist in `localStorage`.
- **Offline:** `index.html` embeds all four JSON bundles; works from `file://` after build. Development uses `python3 -m http.server` with separate JSON fetch.
- **Data pipeline:** Markdown sidecars → `convert_monsters.py` / `convert_spells.py` → bundles → `build_bundles.py`.

## Capabilities and Constraints

**Capabilities (confirmed in codebase):**

- Library mode: search, filters, deep description search, stat block rendering with clickable dice formulas
- Monster spellcasting lists: click a known spell name to peek its full block without leaving the creature
- Tracker mode: initiative order, rounds, drag-reorder, undo/redo, party library, encounter presets, dice tray, player display
- Catalog vs Table navigation in the left column (monsters/spells vs party/encounters)
- Resizable library and tracker columns
- D&D 5e and PF2e visual differentiation (vellum vs paper, brick vs olive system ink)

**Constraints:**

- No server, auth, or cloud sync — local-only persistence
- No CR-to-level or cross-system power comparison (by design; see README §13)
- Data must not be fabricated; parse warnings surfaced in UI
- `index.html` is generated — edit `app.template.html` only
- Render free-tier hosting constraints apply if deployed to Render (ephemeral FS, bind `0.0.0.0:$PORT` for any future server)

**Terminology:** Catalog, Table, Library, Tracker, party, encounter preset, stat block, spine (system color mark on list rows).

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

1. **System fidelity over convenience** — never merge incompatible scales (CR vs creature level) or invent stats not in the source record.
2. **One corpus, many surfaces** — the JSON is the product; the browser is the reference implementation built on it.
3. **Table-speed interaction** — search, add, roll, and track HP in fewest clicks; keyboard shortcuts for search and combat.
4. **Local-first trust** — campaign data stays in the browser; no account required.
5. **Honest data quality** — surface parse status and warnings; do not hide incomplete conversions.

## Accessibility & Inclusion

- Target WCAG 2.1 AA for the Operate UI: keyboard paths, focus management, contrast on tokens, touch targets on coarse pointers.
- Reduced-motion alternative preserves state without global transition kill.
- Player display is supplementary; core GM workflow must remain keyboard-accessible.

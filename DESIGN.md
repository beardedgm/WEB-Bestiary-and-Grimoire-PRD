---
name: Bestiary & Grimoire
description: A tabletop reference and initiative tracker on stone and paper.
colors:
  stone: "#E7E5E0"
  stone-2: "#DCD9D2"
  stone-3: "#F2F1ED"
  hair: "#C5C2B8"
  ink: "#24211C"
  dim: "#5F594F"
  faint: "#645D51"
  vellum: "#FBF6EA"
  vellum-edge: "#E7DBBE"
  paper: "#FFFFFF"
  brick: "#7B2418"
  olive: "#54632A"
  gilt: "#9C7C1C"
  danger: "#9C3020"
  party-sel: "#F4EFDC"
  select: "#EADFBC"
  mark-white: "#F2F1ED"
  mark-red: "#9C3020"
  mark-blue: "#3B6EA5"
  mark-green: "#54632A"
  mark-yellow: "#C4A035"
typography:
  display:
    fontFamily: '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif'
    fontSize: "18px"
    fontWeight: 600
    lineHeight: "1"
    letterSpacing: "0.07em"
  title:
    fontFamily: '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif'
    fontSize: "28px"
    fontWeight: 600
    lineHeight: "1.2"
  section-5e:
    fontFamily: '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif'
    fontSize: "17px"
    fontWeight: 600
    lineHeight: "1"
    letterSpacing: "0.05em"
  section-pf2e:
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    fontSize: "11px"
    fontWeight: 600
    lineHeight: "1"
    letterSpacing: "0.14em"
  body:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "1.55"
  body-stat-5e:
    fontFamily: '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif'
    fontSize: "15.5px"
    fontWeight: 400
    lineHeight: "1.55"
  body-stat-pf2e:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    fontSize: "14.5px"
    fontWeight: 400
    lineHeight: "1.55"
  label:
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    fontSize: "10px"
    fontWeight: 600
    lineHeight: "1"
    letterSpacing: "0.08em"
  label-sm:
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    fontSize: "9.5px"
    fontWeight: 600
    lineHeight: "1"
    letterSpacing: "0.1em"
  meta:
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    fontSize: "10.5px"
    fontWeight: 400
    lineHeight: "1"
    letterSpacing: "0.02em"
  ui-sm:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "1.4"
  ui-xs:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "1.3"
  data-lg:
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    fontSize: "15px"
    fontWeight: 700
    lineHeight: "1.2"
  display-mobile:
    fontFamily: '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif'
    fontSize: "25px"
    fontWeight: 600
    lineHeight: "1.2"
  player-display:
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    fontSize: "clamp(52px, 14vw, 128px)"
    fontWeight: 700
    lineHeight: "1"
  player-display-head:
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    fontSize: "22px"
    fontWeight: 700
    lineHeight: "1"
  player-display-label:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    fontSize: "26px"
    fontWeight: 600
    lineHeight: "1.2"
  player-display-sub:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    fontSize: "20px"
    fontWeight: 400
    lineHeight: "1.2"
rounded:
  sm: "2px"
  md: "3px"
  em-sm: ".25em"
spacing:
  sm: "5px"
  md: "11px"
  lg: "26px"
components:
  chip:
    backgroundColor: "{colors.stone}"
    textColor: "{colors.dim}"
    rounded: "{rounded.sm}"
    padding: "6px 9px"
  chip-on:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.stone-3}"
    rounded: "{rounded.sm}"
    padding: "6px 9px"
  chip-go:
    backgroundColor: "{colors.brick}"
    textColor: "#FBF6EA"
    rounded: "{rounded.sm}"
    padding: "6px 9px"
---

# Design System: Bestiary & Grimoire

## Overview

**Creative North Star: "The Game Table"**

The interface is a GM's physical table: cool stone chrome holds warm paper stat blocks. D&D 5e reads on vellum serif; Pathfinder 2e on clean white sans. System identity is carried by ink color and paper stock, not by reshaping the layout.

Density favors scanability at the table — monospace labels, tight chips, book-spine list marks — without turning into a generic dashboard. The tracker column is the same stone language with combatant cards that reuse the spine metaphor from the catalog list.

**Key Characteristics:**

- Two paper stocks (vellum for 5e, white for PF2e) selected per record, not per theme toggle
- System inks (`brick`, `olive`) for headings and spines; `gilt` reserved for borders and focus, not body text
- Book-spine left accents on list rows and combatant cards (3px system color)
- Chips as the universal control primitive (filters, modes, dice, actions)
- Operate mode: task completion over decoration; brand lives in precise material choices
- Motion is sparse and functional (stat-block enter, disclosure carets, column-resize cue, toasts); `prefers-reduced-motion` disables those transitions/animations individually — never a global `animation-duration` kill

## Colors

Warm neutrals on stone, system colors lifted from printed stat blocks.

### Primary

- **Brick Red** (#7B2418): D&D 5e system ink — stat block titles, 5e list spines, primary CTA fill (`chip.go`), loader title
- **Olive Green** (#54632A): Pathfinder 2e system ink — PF2e spines, high HP bars, nat-20 highlights, heal affordances

### Secondary

- **Gilt** (#9C7C1C): Focus rings, hover borders, trait outlines, underline accents — never small body text (fails 4.5:1 on paper)

### Neutral

- **Stone / Stone-2 / Stone-3** (#E7E5E0 / #DCD9D2 / #F2F1ED): App chrome, column backgrounds, toolbar bands
- **Hair / Hair-soft** (#C5C2B8 / #D8D5CC): Borders, dividers, scrollbar thumbs
- **Ink / Dim / Faint** (#24211C / #5F594F / #645D51): Primary, secondary, and metadata text — `faint` is tuned to pass 4.5:1 on all stone grounds
- **Vellum / Paper** (#FBF6EA / #FFFFFF): Reading-pane stocks for 5e and PF2e respectively
- **Danger** (#9C3020): Errors, damage actions, nat-1, unconscious emphasis

### Named Rules

**The Gilt Border Rule.** Gilt may decorate borders, underlines, and the outer glow of focus rings; it must not carry readable text smaller than large display type. Focus rings pair an `ink` outline (contrast) with a soft gilt glow (brand). Use `brick`, `olive`, or `ink` for labels users read at a glance.

**The Spine Rule.** List items and combatant cards mark game system with a 3px left border in `brick`, `olive`, or `gilt` (party). Selected rows preview their paper stock (`vellum` or `paper`).

## Typography

**Display Font:** Iowan Old Style / Palatino stack (serif)  
**Body Font:** System UI sans stack  
**Label/Mono Font:** UI monospace stack

**Character:** Serif small-caps for encounter and product titles; sans for UI chrome; mono uppercase micro-labels for filters, traits, and numeric metadata.

### Hierarchy

Documented size steps (use these literals in CSS; do not invent ad-hoc values):

| Role | Size | Where |
|------|------|-------|
| Display | 18px serif small-caps | App title, encounter name |
| Title | ~28px (25px mobile) | Stat block name in reading pane |
| Section 5e | 17px serif small-caps | D&D ability block headings |
| Section PF2e | 11px mono uppercase | Pathfinder section labels |
| Body chrome | 15px sans | UI chrome, search, forms |
| Body stat 5e | 15.5px serif | D&D stat block prose |
| Body stat PF2e | 14.5px sans | PF2e stat block prose |
| Label | 10px mono uppercase | Chips, filter summaries |
| Label sm | 9.5px mono uppercase | Range filter captions, ability keys |
| Meta | 10.5px mono | CR/rank line, round label, party metadata |
| UI sm | 12–12.5px | Loader log, dice history, confirm prompts |
| UI xs | 13px | Inline hints, form warnings |
| Data lg | 15px mono bold | Initiative on combatant cards |
| Player display | clamp(52px–128px) mono | Second-screen initiative board |

**The Mono Metadata Rule.** Numbers users hunt mid-combat (initiative, HP, CR, dice totals) use monospace with tabular numerals.

**The Role Scale Rule.** If a new size is needed, add it here and to the frontmatter before using it in CSS.

## Layout

Exclusive app modes via header chips: **Library** (`browse`), **Tracker** (`track` → `body.trk`), **Board** (`board` → `body.board`), **Builder** (`build` → `body.build`), **Forge** (`forge` → `body.forge`), **Lore** (`lore` → `body.lore`), **Maps** (`maps` → `body.maps`).

- **Library / Tracker / Builder:** Three-column flex shell on desktop: library (`#side`, resizable), optional tracker (`#trk`) or builder (`#builder`) in the middle column slot (same `--col-trk` width), reading pane (`#pane`).
- **Builder chrome:** System / ruleset / party size+level / threat chips, live XP meter, roster with qty 1–20, Save to Encounters + Load into Tracker. Catalog is monsters-only for the draft system; Table → Encounters keeps Load + Builder open actions.
- **Board:** Full-height `#board` shell replaces the three columns (rail + snap-grid stage) for **session notes** and tonight's spatial layout. Leaving Board stops audio and freezes running timers. Library search is unavailable with `#side` (by design).
- **Forge:** Full-bleed `#forge` shell (controls rail | live preview) with stone/paper tokens; system chips D&D 5e | Pathfinder; Apply benchmarks + Save to Custom. No Monster Forge leather/gold theme import.
- **Lore:** Full-bleed `#lore` shell pairs a stone **adventure page** rail (active campaign only) with the main markdown editor/preview surface for module text (chapters, scenes); nested pages remain visibly indented and tags filter the tree. Each tree row is handle (`⋮⋮`) | title | **`+`** (add child under that row); drag uses Tracker-style gap lines (before/after) plus an into highlight to reparent, with Alt+↑/↓ among siblings and Alt+→/← indent/outdent; handles disable while a page filter or tag is active. Campaign create/rename/delete lives in the **header** picker — the Lore rail shows a short “Pages for …” hint and page ops only (no second campaign chrome). Selecting a page with body text opens **Preview** (read) by default; **Edit** is opt-in (new or empty pages still open in Edit). The editor includes a grouped chip format toolbar (`#loreFmt`, `role="toolbar"`) — inline | block | insert separators — covering bold / italic / code, H1–H3, bullet / numbered lists, **Read-aloud** quotes, fenced blocks, and a table scaffold; Preview hides the toolbar and mirrors Board `.md-view` typography (including olive read-aloud blockquotes). **Pin to Board** uses `chip.go`; Pin / save notices reuse the Board toast (`#boardToast`) plus the live region. At **≤760px**, the page rail collapses into a **Pages** bottom sheet (scrim + sheet), matching Board’s mobile pattern; Lore chips (including tree `+`) use 44px min-height on coarse/narrow layouts.
- **Maps:** Full-bleed `#maps` shell (stone map-list rail | Pixi stage + settings). Tools are chips (Pan / Reveal / Hide / Token / Measure / Text / Brush / Shape). Token edit overlay `#mapsTokenOvl` sits outside `<main>`. At **≤760px**, the map list becomes a bottom sheet (**Maps** toggle). Canvas library (Pixi) only in this mode.
- Header: brand + mode chips + **Campaign** picker (`#hdrCamp`: `<select>` + New / Rename / Delete; Delete uses `TRK.confirmSwap`) + **Export** (`#user-save`, far right) for portable save export/import; library-list search (`#q` + `#count` in `#sidesearch`) sits under Catalog/Table nav, above Filters / Table bar — not inside Filters. At ≤760px, `#header-actions` is full-width and left-aligned so `#mode` / `#hdrCamp` wrap (`min-width: 0`) and every primary mode stays reachable without page-level horizontal scrolling.
- Column defaults: side 340px, tracker/builder 380px; drag gutters 6px
- Mobile breakpoint **760px**: stack Library/Tracker/Builder columns, hide resize handles; Board collapses the add rail into a **Cards & sessions** bottom sheet (scrim + sheet) so add/session actions stay reachable — mobile overrides use `body.board #board …` / `body.lore #lore …` specificity so toggles are not left `display:none` by the desktop base rules; Lore collapses the page rail into a **Pages** bottom sheet; Maps collapses the map list into a **Maps** bottom sheet; Forge stacks rail above preview. At ≤760px those rails **slide up from the bottom** (280ms drawer ease) with a scrim fade; `prefers-reduced-motion` drops the slide.
- Touch/coarse pointer: 44px minimum on tracker damage/heal/remove, catalog add, Board card ops / primary card controls, and Lore editor / format / tree-add chips on the narrow breakpoint
- Body scrolls when zoom or content exceeds viewport (`overflow: auto`)

## Elevation & Depth

Flat-by-default stone surfaces. Depth is tonal layering (`stone` → `stone-3` toolbars → `paper`/`vellum` sheets), not floating cards.

### Shadow Vocabulary

- **Stat block sheet** (`0 1px 2px rgba(36,33,28,.07), 0 10px 26px -14px rgba(36,33,28,.24)`): Reading pane record only — a single sheet on the table
- **Board cards:** Same shadow vocabulary as the stat block sheet — Board cards are interactive surfaces that may lift; Library chrome stays flat

**The Flat Chrome Rule.** Sidebars, headers, and lists have no drop shadow. Only the active stat block (and Board cards) lifts.

## Shapes

- **Radius:** 2px chips and micro-controls; 3px (`--radius`) search field and loader drop zone
- **Borders:** 1px `hair` default; 2px dashed for file-drop; 3px left spine on list/card rows
- **Stat block rule:** 2px tapered gradient (5e) or 1px hairline (PF2e) under the title

## Components

### Board cards

Snap-grid cards on the Board stage for session notes. Markdown cards use vellum stock; blockquotes render in olive as **read-aloud** cues. Shared Board/Lore `md()` Preview treats CommonMark backslash-escapes (e.g. `\.`, `\*`) by dropping the `\`, and collapses doubled `>` markers into one read-aloud quote (empty `>`-only lines are skipped). Card chrome may use the sheet shadow (interaction surfaces). Record cards render a linked Library stat block on paper stock with the sheet's own chrome suppressed (no inner border/shadow/max-width — the card is the sheet); a broken link shows an italic dim missing-record notice. Encounter cards list the linked preset's roster on paper stock with chip actions in the footer; missing presets use the same italic dim notice pattern as missing record refs. Lore cards resolve a linked campaign/page id and render the live body through the shared `.md-view`; a deleted campaign or page uses the same italic dim missing notice as a broken record link.

- Session delete and non-empty card remove use Tracker `confirmSwap` (no `window.confirm` / `prompt`)
- Markdown Expand (`#boardExpand`, outside `<main>`): Tab focus trap, `setAppInert`, Escape/Done commit; counter wedges use `--brick` / `--stone-3` / `--hair` (Fill ± for keyboard)
- Mobile: **Cards & sessions** toggle opens the rail as a bottom sheet over a scrim

### Chips

- **Shape:** 2px radius, 6×9px padding (24px tall — WCAG 2.5.8 target)
- **Default:** stone fill, dim text, hair border
- **Selected:** ink fill, stone-3 text; system variants use brick/olive fill with `#FBF6EA` text
- **Primary action (`go`):** brick fill
- **Focus:** dual ring — `ink` outline (AA non-text contrast) plus soft gilt outer glow; never gilt text or gilt-only rings on stone/paper

### List items

- Spine-colored left border by system; hover `stone-2`; selection previews paper stock
- Metadata line in faint mono (CR, rank, variant)

### Combatant cards

- Reuse spine colors; initiative in bold mono; HP bar 4px with olive/gilt/brick fill by percentage
- Inline confirm replaces destructive chip — never `window.confirm`
- Marker swatches sit in the name row immediately before AC (see Markers)

### Markers

- Fixed five colors: white, red, blue, green, yellow (`--mark-*` tokens)
- Always-visible ~12px circles on every combatant card; click cycles `off → solid → outline → off`
- No legend — ad-hoc table-ring shorthand only
- Player display shows active markers only (solid fill / outline ring) in a cluster beside Hurt/Bloody/Unconscious badges
- `aria-label` on each swatch includes color name and state so color is not the only cue for the GM

### Inputs

- Paper or stone fill, hair border; focus uses ink border + gilt glow (same dual-ring as chips)
- Search field (`#q`) is the primary **library-column** input (Catalog monsters/spells and Table party/encounters); `/` focuses it; filter range selects use compact mono styling
- Result count (`#count`) sits under the search field in `#sidesearch`

### Navigation

- Segmented control (`Catalog | Table`) in stone-2 tray; inner chips for Monsters/Spells/Party/Encounters
- Native `<details>` for Filters and Dice — keyboard and disclosure behavior come free
- Spell-only filter chips live in `#f-extra`; `#f-extra[hidden]{display:none !important}` so `.frow` flex cannot leak them onto Catalog Monsters (same pattern as table-bar hidden overrides)
- **Custom** filter chip beside system chips; custom list rows use a dashed gilt spine (`.item.custom`)
- List footer (`#listfoot`): overflow hint; `+` (`#custom-add`) for adding one custom creature/spell

### Custom library dialog

- Wide overlay (`#trkovl` `.dlg.wide`): stub toggle (Spell | D&D 5e | PF2e), JSON textarea, Import only
- **Authoring JSON ≠ stored JSON:** four stub chips (5e/PF2e spell Fireball, 5e/PF2e Lich) with `schema` / `id` / `gameSystem` / `source` / `variant` / `parse` stripped; Import stamps plumbing from the selected toggle’s system
- Import **stamps** plumbing (`{sys}:custom:{slug(name)}`, custom source, parse) then deep-validates; safe as an AI/notes fill-in template
- Confirm before replacing an existing custom with the same id
- `#trkovl` / `#dpop` / `#pdisp` sit **outside** `<main>` so `setAppInert` does not make overlays unclickable
- Remove from library control on custom pane meta (confirm via `confirmSwap`)

### Portable save dialog

- Normal-width overlay from header **Export**: Export, Download backup first, Import (`bg-user-save/1`)
- Import confirms encounter replace + same-id overwrites; merge-keep-local for other ids; invalid customs skipped with a count
- Customs store writes are atomic (failed write leaves previous data); invalid rows dropped on load with a live announcement

### Spell links (`.slink`)

- Inline buttons inside monster Spellcasting lists only (structured `spellcasting` rows)
- Italic + solid underline in `--sysink` — distinct from `.droll` dotted underline (rolls)
- Unmatched corpus names stay plain text; never a dead button

### Spell peek (`#spellpeek`)

- Absolute overlay covering only `#pane`; monster sheet stays underneath with `aria-hidden`
- Sticky toolbar: Close, Back to {monster}, optional “Listed under …”, Open in catalog
- Body reuses `spellHTML()` (full block, including clickable dice)
- Escape closes after dice pop / tracker dialog; does not change URL hash or catalog selection
- Do **not** set `inert` on header/main for spell peek — library search and tracker must stay usable

## Do's and Don'ts

### Do:

- **Do** assign `--sysink`, `--sheet`, and `--cell` on `#pane` per game system
- **Do** use `aria-pressed` on chip toggles so state is not color alone
- **Do** keep the reading pane measure near 760px max on stat blocks

### Don't:

- **Don't** use gilt as foreground on vellum, paper, or stone (contrast failure)
- **Don't** nest focusable controls inside listbox options — keyboard path uses Enter on the listbox
- **Don't** animate layout properties during column resize or list rebuild
- **Don't** edit `index.html` directly — it is generated from `app.template.html`

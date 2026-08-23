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

**The Gilt Border Rule.** Gilt may outline, focus, or underline; it must not carry readable text smaller than large display type. Use `brick`, `olive`, or `ink` for labels users read at a glance.

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

Three exclusive app modes via header chips: **Library** (`browse`), **Tracker** (`track` → `body.trk`), **Board** (`board` → `body.board`).

- **Library / Tracker:** Three-column flex shell on desktop: library (`#side`, resizable), optional tracker (`#trk`, resizable), reading pane (`#pane`).
- **Board:** Full-height `#board` shell replaces the three columns (rail + snap-grid stage). Leaving Board stops audio and freezes running timers.
- Column defaults: side 340px, tracker 380px; drag gutters 6px
- Mobile breakpoint **760px**: stack Library/Tracker columns, hide resize handles; Board hides the add rail (stage full width)
- Touch/coarse pointer: 44px minimum on tracker damage/heal/remove and catalog add buttons
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

Snap-grid cards on the Board stage. Markdown notes use vellum stock; blockquotes render in olive as **read-aloud** cues. Card chrome may use the sheet shadow (interaction surfaces).

### Chips

- **Shape:** 2px radius, 6×9px padding (24px tall — WCAG 2.5.8 target)
- **Default:** stone fill, dim text, hair border
- **Selected:** ink fill, stone-3 text; system variants use brick/olive fill with `#FBF6EA` text
- **Primary action (`go`):** brick fill
- **Focus:** gilt border + soft gilt glow (box-shadow), never gilt text

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

- Paper or stone fill, hair border, gilt focus ring
- Search field is primary chrome input; filter range selects use compact mono styling

### Navigation

- Segmented control (`Catalog | Table`) in stone-2 tray; inner chips for Monsters/Spells/Party/Encounters
- Native `<details>` for Filters and Dice — keyboard and disclosure behavior come free
- **Custom** filter chip beside system chips; custom list rows use a dashed gilt spine (`.item.custom`)
- List footer (`#listfoot`): overflow hint; `+` (`#custom-add`) for adding one custom creature/spell; `Save` (`#user-save`) for portable export/import

### Custom library dialog

- Wide overlay (`#trkovl` `.dlg.wide`): stub toggle (Spell | D&D 5e | PF2e), JSON textarea, Import only
- **Authoring JSON ≠ stored JSON:** four stub chips (5e/PF2e spell Fireball, 5e/PF2e Lich) with `schema` / `id` / `gameSystem` / `source` / `variant` / `parse` stripped; Import stamps plumbing from the selected toggle’s system
- Import **stamps** plumbing (`{sys}:custom:{slug(name)}`, custom source, parse) then deep-validates; safe as an AI/notes fill-in template
- Confirm before replacing an existing custom with the same id
- `#trkovl` / `#dpop` / `#pdisp` sit **outside** `<main>` so `setAppInert` does not make overlays unclickable
- Remove from library control on custom pane meta (confirm via `confirmSwap`)

### Portable save dialog

- Normal-width overlay from footer **Save**: Export, Download backup first, Import (`bg-user-save/1`)
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
- Do **not** set `inert` on header/main — tracker and search must stay usable

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

# Tracker — player display: stone board, ink marker, masked enemies — 2026-09-04

**Status:** Implemented.
**Approved comp:** the "Player Display" canvas (private artifact
`https://claude.ai/code/artifact/69a833be-27f8-4f7c-8309-44a5daa23af2`), page *Final*; standalone
copies in [`../../mockups/player-display.html`](../../mockups/player-display.html) and
[`../../mockups/player-display-twenty.html`](../../mockups/player-display-twenty.html).
**Prior art:** the first player display (`pdHTML` / `pdCSS` / `scalePd`, one renderer for the
popup, the `#pd` fallback page and the layer on this screen) and the Markers rule in `DESIGN.md`.

## Product decision test

**Headline: yes — 7/7, table speed up.** The GM casts the display to the TV so the table can read
whose turn it is and who is on deck without asking; that only works if a glance answers both. The
old board answered neither well (a thin gilt spine on a near-black screen) and its sliding roll
toast coincided with the cast tab freezing. The new board makes the active row the marker, keeps
enemies masked until the GM chooses otherwise, and animates nothing — "I need this" to "I am using
it" with nothing added to the GM's own workflow beyond one chip on the card they already use.

1. Strengthens play (the table reads the TV, not the GM's laptop) and the prep→play handoff
   (presets carry the alias numbering).
2. Reuses the encounter objects `TRK` owns; the display is a projection, never a second roster.
3. Ownership clear: `TRK` owns `alias` / `revealed`; only the display reads them.
4. Table speed up: whose turn and who is next are the first thing on the screen; Reveal is one
   click on the card.
5. Fidelity: names, initiative order, markers and Hurt / Bloody / Unconscious ride through
   unchanged; no HP number, no stat leakage.
6. Local-first: nothing new is stored beyond two fields on the encounter; nothing leaves the
   device.
7. Simpler than a separate display app or the players craning at the GM's screen.

## Problem

The GM liked the display's responsiveness (rows scaled to fill the TV) and disliked everything
else: the dark screen, the type, the bareness, and an active cue that was a thin gilt spine with a
faint wash. Every monster showed its real name, so the table knew what it was fighting before the
GM said so. The roll toast slid in with a `transform` + `opacity` transition, and Chrome's tab cast
freezes when the compositor is asked to promote layers — the GM's own diagnosis of the freezes they
saw while casting.

## Approach (locked)

- **The list never moves; the marker does.** A centred stack of equal-height paper rows on stone.
  The active row fills in `ink` with `stone-3` text and walks down the list as turns pass. No
  `Now` / `Next` label on the display: the ink row says now, the row beneath it is next.
- **One masking policy.** `pdMasked(c)` is `c.type === "monster"`; players and NPCs always show
  their names. Widening it later is one line.
- **Stable aliases.** Each masked combatant gets a positive integer `alias` from the encounter's
  `aliasSeq` counter when added (`addMany`); `vEnc` validates both, absorbs every alias in use
  into the counter, then hands the next numbers to rows that lack one in list order. A number is
  never reissued or renumbered when rows move, leave, or are revealed. `resetEnc` / `clearAll`
  reset the counter; a preset saved before this change gets numbered on first validation.
- **Reveal is a tracker action.** `toggleReveal(id)` runs through `mutate` (undoable, a glance-strip
  line, display push). The card carries one chip at the head of the HP row (`.cbt-rv`,
  `aria-pressed`): it reads the alias (`Enemy N`) while masked and `Revealed` once the display
  shows the name, so the readout and the control are the same 50px. It lives in the HP row, not
  the name row: with the unconscious chip, markers, AC and remove already there, a name-row chip
  clipped "Wolf" to "W." at the default 380px column, and a separate alias readout beside the chip
  squeezed the HP bar to 26px. Cards, panes, Board and Maps keep the name; only the display
  projects the alias.
- **Two columns past ten.** `pdColumns(n)`: one column to ten combatants, then two of ⌈n/2⌉ read
  top to bottom; the short column is padded so flex keeps heights equal. `scalePd` computes the row
  height from what is left after the header, column padding and roll band, and sets
  `--pd-fs = clamp(22px, 0.36 × row + 15px, 84px)`; every size inside a row is an em of it.
- **The roll card is static.** A 100px band at the foot always holds its place; the card is
  inserted whole and removed whole after 3.2 s. `pdCSS()` contains no `transform`, `transition`,
  `animation`, `will-change`, `filter` or `backdrop-filter`, and nothing is `position:fixed`; the
  only shadow is the white marker's hairline ring on paper rows.
- **The `#pd` fallback repaints only on change.** The poller caches the raw stored strings for the
  encounter and the roll and rewrites the board only when one changed; a `storage` listener makes
  same-origin tabs immediate; a roll stored before the page opened is never replayed.

## Acceptance criteria

| # | Criterion | Check |
|---|---|---|
| 1 | Five combatants: equal paper rows in a ≤1320px column, one ink row, no "Now"/"Next" text | Popup at 1920×1080, rows 147px each, `.on` background `rgb(36,33,28)` |
| 2 | Twenty: two columns of ten, combatant 11 heads the right column; twenty-five: 13 + 12 + one pad, last row above the roll band | `data-cols="2"`, rows 72px / 54px, `--pd-fs` 41px / 34.4px |
| 3 | Monsters read `Enemy 1..n`; players and NPCs by name; numbers survive `moveBy`, `removeCombatant` and reveal; a later add takes the next number | Alias readout unchanged across each operation |
| 4 | Reveal chip: reads `Enemy N`, click → `aria-pressed="true"` and reads `Revealed`, popup shows the name, glance line, focus back on the chip; undo reverts all. Name unclipped and HP bar 71px at the default 380px column (26px with a separate readout, 2px at the 260px minimum, where the row overflows) | Click `.cbt-rv`, `TRK.undo()` |
| 5 | Round 0 shows the wait line and player names only | Round-0 encounter |
| 6 | Roll card appears within ~300 ms with no transition / transform / animation, row rects unchanged, gone after 3.5 s; popup `<style>` has none of the banned properties | `#pd-showrolls` on, click `#d-roll` |
| 7 | White marker: 2px `faint` border (solid) / hairline ring (outline) on paper rows; plain on the ink row | Computed styles |
| 8 | `#pd` page: zero DOM mutations over 3 s idle; a change from the GM tab repaints within 600 ms | MutationObserver on `#pdisp` |
| 9 | `vEnc` assigns `[1, null, 2]` to monster / player / monster, honours a larger `aliasSeq`, de-duplicates a repeated alias, keeps `revealed`, drops junk, is idempotent | `TRK._test.vEnc` |
| 10 | Reveal chip ≥ 44px tall on coarse pointers; gates green | CDP pointer emulation; `build_bundles.py --check`, `check_inline_scripts.py` |

## Non-goals

- No HP numbers or stat leakage on the display; badges stay Hurt / Bloody / Unconscious.
- No animation of any kind, including a reduced-motion alternative — there is no motion to reduce.
- No phone or portrait layouts; the display is a 16:9 TV surface.
- No "reveal all" or per-encounter masking preference; Reveal is per combatant, undoable.
- No third column; past ~40 combatants the second column clips at the 40px row floor.

## Primary files

- `app.template.html` — `TRK`: `pdMasked`, `toggleReveal`, `vEnc` (`aliasSeq`, `alias`,
  `revealed`), `addMany`, `resetEnc` / `clearAll`, `evtLine` (`reveal`), `cardSig` / `cardHTML`
  (`.cbt-rv`), click delegation, `pdLabel`, `pdColumns`, `pdHTML`, `pdCSS`,
  `scalePd`, `ensurePdLayout`, `flashPdToast`, the `#pd` block, exports; CSS `.cbt-rv` and the
  three coarse-pointer blocks.
- `DESIGN.md` (player display type roles and the new *Player display* section), `PRODUCT.md`,
  `CLAUDE.md`, `docs/mockups/player-display*.html`.

## Verification

Served the template (`python3 -m http.server 8123`) and drove it with Playwright: the GM page seeds
encounters through `TRK.replaceEncounter`, the popup is captured from `TRK.openPdWindow()` and sized
to 1920×1080, a second tab loads `#pd`, and a CDP session emulates a coarse pointer. Every
criterion above was measured from computed styles and bounding rects, not screenshots; screenshots
were compared against the approved comp by eye.

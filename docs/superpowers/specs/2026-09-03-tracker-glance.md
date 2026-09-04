# P4 — Recent combat events — 2026-09-03

**Status:** Implemented 2026-09-03.
**Roadmap:** [`../plans/2026-09-03-connected-improvements-roadmap.md`](../plans/2026-09-03-connected-improvements-roadmap.md)

## Problem

After looking away for ~30 seconds, the GM cannot instantly reacquire round, whose turn,
who is next, HP state, markers, and **what just happened** without scanning dense chrome.

## Metric

Look away 30s, look back, know round / current / next / HP / markers (and a short “what
just happened” strip).

## Approach (locked)

- Stronger visual hierarchy for **current** and **next** combatants (not colour alone).
- Event strip fed by **semantic metadata** at mutate time, e.g.
  `mutate(enc => { … }, { kind: "damage", target: combatantId, amount: 7 })`.
- **Do not** derive events by diffing undo snapshots (`hist.past` is opaque encounter JSON).
- **Ephemeral** in-memory ring (~10–20 events). Does not survive refresh (same as undo).
  Table-speed awareness — **not** a combat history / export / Foundry log.

## Acceptance criteria

- Current/next hierarchy is glanceable at session distance (Operate / Game Table).
- Damage/heal/advance (and similar) emit semantic events into the ring when they mutate.
- Strip shows recent human-readable lines; cleared or irrelevant after encounter reset as
  defined at implementation (still in-memory only).
- No rules automation (conditions engines, auto-death, etc.).
- No persistence, portable-save field, or Board mirroring of the event strip.

## Non-goals

- Inferring events from undo snapshot diffs
- Persistent combat log / chat / export
- Rules automation / condition machines
- Live Board mirroring of Tracker state
- Redesigning Player Display as the primary fix

## Primary files

- `app.template.html` — TRK `mutate` / combat ops / render

## As implemented

**`mutate(fn, meta)`.** `meta` is optional and semantic — `{ kind, name?, amount?, hp?, … }`
— never a snapshot diff. It may also be a **function of the healed encounter**, called after
`vEnc` has run, because some lines can only be written from the outcome: `applyHP` needs the
resulting HP (and whether that crossed 0), and `nextTurn` / `prevTurn` need the combatant who
actually ended up holding the turn rather than the one the walk aimed at. Kinds emitted:
`dmg`, `heal`, `turn`, `start`, `end`, `add`, `drop`, `reset`, `clear`, `load`, `mark`,
`undo`, `redo`. Anything else is dropped instead of rendered blank. Reorders, initiative
edits and renames stay silent — the list itself already shows them.

**Ring.** Module-scoped `events` array, newest first, `EVT_MAX = 14`, entries
`{ id, kind, text }`. No `localStorage` key, no `bg-user-save/1` field, no Board mirroring;
it dies with the page like `hist`. `start` / `reset` / `clear` / `load` replace the whole
ring (the roster their lines described is gone) and `applyUserSave` empties it beside the
undo ring. **Undo does not rewind the ring** — the ring records what the GM did, and undoing
is one of those things, so `undo` / `redo` append their own line.

**Strip.** `#trkglance` sits between `#trkbar` and `#trklist`: a `Now` / `Next` line
(current combatant with HP, then the next name) over the ring as an `<ol>`, capped at ~3
visible lines and scrollable for the rest. Recency is the hierarchy — the newest line is
`ink`, older lines `dim` — with per-kind spine colours on damage / heal / turn. The strip is
`aria-hidden`: `#trklive` already speaks every line, and a second copy would double every
announcement. It hides entirely outside combat with an empty ring.

**Current / next on the cards.** `nextIdOf(enc)` runs the same walk `nextTurn` does (wrapping
at the end, and **not** skipping the unconscious — that would be rules automation), so the
badge cannot promise an order the Next chip will not follow; it returns `null` for a lone
combatant rather than badging one card twice. `.cbt.on` keeps its gilt inset ring and gains
a 6px spine (padding compensates so the row does not shift) and a bolder name; both states
carry a mono `Now` / `Next` badge — ink fill versus stone outline — so the cue is never
colour alone. `cardSig` includes the next flag so the diff render repaints it.

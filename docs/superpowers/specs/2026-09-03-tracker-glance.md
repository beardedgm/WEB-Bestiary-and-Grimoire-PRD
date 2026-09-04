# P4 — Recent combat events — 2026-09-03

**Status:** Stub (revised). Implementation not started.
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

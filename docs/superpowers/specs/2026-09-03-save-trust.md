# P2 — Save finishing polish — 2026-09-03

**Status:** Stub (revised). Scope honesty already shipped; timestamp polish remains.
**Roadmap:** [`../plans/2026-09-03-connected-improvements-roadmap.md`](../plans/2026-09-03-connected-improvements-roadmap.md)

## Problem

The Save dialog already states what portable JSON includes and that Maps imagery / large
Board media need separate exports; import warns before replacing the live encounter; partial
persistence failures are reported honestly. A nontechnical GM still cannot see **when** they
last successfully downloaded a save on this device.

## Metric

GM can see last successful portable download time and still understand scope boundaries.

## Tracks

### P2 — Finishing polish (ship)

- On successful Download, persist a timestamp (e.g. `lastPortableExportAt`).
- Show **“Last downloaded save: …”** or **“Last portable export: …”** in the Save dialog.
  Never “Last backup” — a timestamp does not prove the file still exists on disk.
- Keep / lightly reinforce the existing Maps-images-exported-separately reminder.

### P2b — Campaign archive (later)

- New format bundling JSON + map/media blobs.
- Do **not** enlarge `bg-user-save/1` past 8 MB or stuff map blobs into portable JSON.

## Acceptance criteria

**P2**

- Successful Download writes a validated last-download timestamp; failed/cancelled does not.
- Dialog shows that time with clear wording (downloaded save / portable export).
- Existing scope copy (JSON vs Maps Export vs Board zip) remains accurate.

**P2b**

- Documented archive format + import path; map/media round-trip without bloating `bg-user-save/1`.

## Non-goals

- Re-litigating Save dialog honesty already shipped
- Cloud sync or accounts
- Stuffing IndexedDB map blobs into `bg-user-save/1`

## Primary files

- `app.template.html` — `openUserSaveDialog`, `downloadUserSave`, `buildUserSaveAsync`

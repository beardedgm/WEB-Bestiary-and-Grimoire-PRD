# P2 — Save finishing polish — 2026-09-03

**Status:** Track A (P2) **Implemented** 2026-09-03. Track B (P2b campaign archive) not started.
**Amended 2026-09-03:** a code review of the shipped dialog found that the import confirm
row stayed armed after a later file was rejected (Import then committed the earlier bag),
and that the over-limit download warning was never cleared. Both were fixed as maintenance,
so the Problem statement below is now accurate and P2's scope is unchanged.
**Roadmap:** [`../plans/2026-09-03-connected-improvements-roadmap.md`](../plans/2026-09-03-connected-improvements-roadmap.md)

## Problem

The Save dialog already states what portable JSON includes and that Maps imagery / large
Board media need separate exports; import warns before replacing the live encounter; partial
persistence failures are reported honestly. A nontechnical GM still cannot see **when** they
last successfully downloaded a save on this device.

## Metric

GM can see last successful portable download time and still understand scope boundaries.

## Tracks

### P2 — Finishing polish (shipped)

- On successful Download, persist a timestamp (e.g. `lastPortableExportAt`).
  Shipped: `bg.userSave.meta.v1` holds `lastPortableExportAt` (ISO string, validated by
  `vUserSaveMeta`, dropped whole if unparseable). `downloadUserSave` stamps only after the
  blob is handed to the browser, so a failed build or handoff leaves no mark.
- Show **“Last downloaded save: …”** or **“Last portable export: …”** in the Save dialog.
  Never “Last backup” — a timestamp does not prove the file still exists on disk.
  Shipped: `#user-save-when` renders local `dateStyle: medium` / `timeStyle: short` via
  `renderSaveStamp`, with the caveat that it records the download, not the file's survival.
- Keep / lightly reinforce the existing Maps-images-exported-separately reminder.
  Shipped copy already states it once; deliberately not repeated.

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

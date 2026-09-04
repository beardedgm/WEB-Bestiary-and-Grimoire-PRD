# P2 — Save finishing polish — 2026-09-03

**Status:** Track A (P2) **Implemented** 2026-09-03. Track B (P2b campaign archive) **Implemented** 2026-09-04.
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

### P2b — Campaign archive (shipped 2026-09-04)

- New format bundling JSON + map/media blobs: **`bg-campaign-archive/1`**.
- Does **not** enlarge `bg-user-save/1` past 8 MB or stuff map blobs into portable JSON — the
  bag inside the zip is unchanged and still under the same 8 MB rule; media and maps ride
  beside it as files.

#### Format

```
bestiary-grimoire-archive.zip        STORE only, no zip64 (lib/board-zip.js limits)
├─ manifest.json   { "schema": "bg-campaign-archive/1", "exportedAt": ISO,
│                    "maps": ["maps/m0.json", …],      # sidecar paths — the index of map records
│                    "media": <int> }                   # board-media file count
├─ save.json       the bg-user-save/1 bag exactly as buildUserSaveAsync() returns it, except
│                  boards[].cards[] of type image | audio carry
│                    "src":   "board-media/<n>.<ext>"   (was a data: URL)
│                    "_mime": "<mime>"                  (same stash bg-board-zip/1 uses)
├─ board-media/<n>.<ext>   raw bytes of one card's media; <n> decimal, <ext> = mime subtype
│                          stripped to [a-z0-9], "bin" fallback (the bg-board-zip/1 rule)
├─ maps/m<n>.json  { "id", "name", "updated", "mime", "image": "maps/m<n>.<ext>", "state" }
│                  = the bg-maps record with its blob replaced by image path + mime
└─ maps/m<n>.<ext> raw image bytes (blob.type; "application/octet-stream" when empty —
                   createImageBitmap sniffs content, so no mime is ever invented)
```

Rules:

- **Ids are preserved and the campaign is the join.** Only maps referenced by some
  `save.json` `campaigns[].maps[].id` are archived; IDB orphans stay local. On import, only
  sidecars whose `id` joins an incoming meta that `CAMPAIGN.applyUserSave` will keep (first
  `MAX_CAMPAIGNS` campaigns, first 100 metas each — `plannedMapIds`) are written; the rest are
  counted and skipped. Map ids never become file names (`vMapMeta` accepts any 64-char string).
- **A meta whose blob is missing on the exporting device stays in `save.json`.** Another
  device may still hold that blob, and incoming-wins would otherwise strip the meta there. The
  download notice reports the count; on a device without the blob, Maps keeps its existing
  "Map data missing from local storage" behaviour.
- **`save.json` alone is a valid `bg-user-save/1`.** Imported through the JSON path, media
  cards come back empty — a documented degrade, not corruption.
- **Sizes.** `save.json` ≤ 8 MB on both sides (warn on export, reject on import — the JSON
  save's own pair). The zip: export warns over 256 MB, import rejects over it (`unpackZip`
  needs the whole file in memory; re-inlining data URLs peaks near 2.5×). No per-map cap: a
  map you could create from a file must restore.
- Bump to `/2` only for layout or manifest changes; the inner bag versions independently and
  passes the same schema gate as the JSON import.

#### As shipped

- **Where.** Script 1 beside the save functions: `buildCampaignArchiveAsync` /
  `downloadCampaignArchive` / `readCampaignArchive` / `applyCampaignArchiveAsync`,
  `vArchiveManifest`, `plannedMapIds`; `handOffDownload` extracted from `downloadUserSave` so
  the "stamp only after handoff" rule has one home and both downloads stamp
  `lastPortableExportAt` (the "Last downloaded save" line stays true for either — no second
  stamp). `lib/board-zip.js` gained `packZipParts` (parts straight into a `Blob`, no second
  copy), a hardened `unpackZip` (local-header check, entry bounds, `{ verify: true }` CRC-32,
  null-prototype result), and the shared `detachMedia` / `attachMedia` pair that the Board zip
  now uses too. `MAPS` gained a three-call record bridge — `exportRecords(ids)`,
  `importRecords(recs)`, `removeRecords(ids)` — so the record shape and its validators stay
  in the file that reads them back.
- **Import order.** Board media is re-inlined **before** any validator sees the bag
  (`mediaSrc` admits only `data:image/` / `data:audio/`). Map blobs are written **before**
  `applyUserSaveBagAsync`: `CAMPAIGN.applyUserSave` → `pushActiveToTrkAndRefresh` →
  `MAPS.onCampaignChanged` reopens Maps from whatever is stored at that instant, and writing
  first lets a quota failure abort before any localStorage write. `importRecords` first flushes
  a pending map edit and closes the editor so a debounced autosave cannot clobber an imported
  record; the campaign merge reopens it. No extra `onCampaignChanged` on the success path.
- **All-or-nothing map phase.** The first put failure rolls back every put made so far
  (previous records restored, new ids removed) and rejects with "Nothing was changed"; a meta
  whose blob failed would be a list row that can neither open nor be deleted. If the bag apply
  then returns `changed: false` (the customs-store abort), the same rollback runs.
- **Dialog.** One **Import save…** chip for both formats, branching on the `PK` signature
  (never name or type — Windows reports `application/x-zip-compressed` or nothing). Every
  rejection goes through `rejectFile`, so an earlier confirm row is always torn down; the
  archive confirm row states the exact map-image and board-media counts and that a campaign
  in the file replaces this device's copy, map list included. Chips go `aria-busy` while a
  download builds or an import reads/applies.
- **Same-id campaign.** Incoming wins for `maps[]` exactly as for lore / party / presets;
  device-only maps of that campaign leave the list (their blobs stay as orphans, the class
  `deleteCampaign` already leaves).

## Acceptance criteria

**P2**

- Successful Download writes a validated last-download timestamp; failed/cancelled does not.
- Dialog shows that time with clear wording (downloaded save / portable export).
- Existing scope copy (JSON vs Maps Export vs Board zip) remains accurate.

**P2b**

- [x] Documented archive format (above) + import path; map/media round-trip without bloating
  `bg-user-save/1` — `save.json` inside the zip is the unchanged bag under the same 8 MB rule.

## Non-goals

- Re-litigating Save dialog honesty already shipped
- Cloud sync or accounts
- Stuffing IndexedDB map blobs into `bg-user-save/1`

## Primary files

- `app.template.html` — `openUserSaveDialog`, `downloadUserSave`, `buildUserSaveAsync`;
  P2b: `buildCampaignArchiveAsync`, `downloadCampaignArchive`, `readCampaignArchive`,
  `applyCampaignArchiveAsync`, `handOffDownload`; `BOARD.exportBoardZip` / `importBoardZip`
  moved onto the shared helpers
- `lib/board-zip.js` — `packZipParts`, hardened `unpackZip`, `detachMedia` / `attachMedia`
- `maps/maps-app.js` — `exportRecords` / `importRecords` / `removeRecords`

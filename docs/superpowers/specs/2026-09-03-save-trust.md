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
  download notice reports the count. **On import the rule inverts:** a meta whose blob will
  not arrive — no sidecar, or one skipped as oversize, broken, or unjoined — is kept only when
  the importing device already holds that map (the meta then joins that copy, reported as
  "kept this device's existing image"); otherwise it is taken off the incoming campaign's
  list before the merge sees it, reported as "left off the campaign's list". A meta with no
  blob is a row that can neither open nor be deleted, which is the state the map phase exists
  to prevent.
- **`save.json` alone is a valid `bg-user-save/1`.** Imported through the JSON path, media
  cards come back empty — a documented degrade, not corruption.
- **Sizes.** `save.json` ≤ 8 MB on both sides (warn on export, reject on import — the JSON
  save's own pair). The zip: export warns over 256 MB, import rejects over it (`unpackZip`
  needs the whole file in memory; re-inlining data URLs peaks near 2.5×). No cap on a map
  **image**: a map you could create from a file must restore. A map's **editor state** is
  capped at `ARCHIVE_SIDECAR_MAX` (64 MB of JSON) — a warn/reject threshold, **not** a bound
  on what `vState` accepts, which runs far past any size worth parsing in one go:
  `MAX_STROKE_PTS` (100,000) is *per stroke* and `MAX_ANNOT` allows 1,000 of them, so legal
  state runs far larger than it looks. That cap is the same warn/reject pair as `save.json`:
  export warns when a sidecar exceeds it, import refuses it. A sidecar skipped for size is
  counted and reported apart from an unreadable one — the file is fine, and the fix is to
  simplify that map's drawings, not to hunt for a corrupt archive.
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
  first lets a quota failure abort before any localStorage write. `replaceRecords` flushes a
  pending map edit and closes the editor before it snapshots, so a debounced autosave cannot
  clobber an imported record and the snapshot is of what is truly stored; the campaign merge
  reopens it. `exportRecords` flushes too, without closing, so a rescue export of a map whose
  autosave failed on quota carries the edit on screen rather than the last successful save.
  No extra `onCampaignChanged` on the success path.
- **All-or-nothing map phase, owned by MAPS.** `MAPS.replaceRecords(recs)` is the archive's
  only write path and owns every ordering rule, because each is a property of that store and
  the two times Script 1 sequenced them itself it got them wrong. In order: **flush the open
  editor, then snapshot** (a snapshot taken before the flush restored a record older than
  the one MAPS had just written); **a read failure while snapshotting aborts before any
  write** — "could not read" mistaken for "does not exist" would make the undo delete the
  GM's own map; write sequentially; on the first failure **undo exactly the written prefix**,
  added ids deleted first because the failure is usually quota and those blobs are the space
  the re-puts need — re-putting records the failed import never reached had produced a
  spurious "could not be put back" on the very store that just refused a write. Undo
  re-renders the list and reopens only if there is a map to open, **never the
  campaign-change path**, which seeds a starter map — the old rollback did, and wrote a
  starter map after saying "Nothing was changed." On success it hands back `undo` for a bag
  phase that then returns `changed: false` or throws (the throw path used to leave the map
  phase committed with no rollback and no mention). "Nothing was changed" is said only when
  undo reports every record came back; a shortfall names re-importing a known-good archive.
- **Dialog.** One **Import save…** chip for both formats, branching on the `PK` signature
  (never name or type — Windows reports `application/x-zip-compressed` or nothing). Every
  rejection goes through `rejectFile`, so an earlier confirm row is always torn down; the
  archive confirm row states the exact map-image and board-media counts and that a campaign
  in the file replaces this device's copy, map list included. Chips go `aria-busy` while a
  download builds or an import reads/applies. **An import with anything to report stays
  open** — skipped, pruned, or locally-kept maps, dropped customs, missing media — with the
  result in the notice line; only a clean import closes the dialog, and only the dialog it
  started from. Closing on a message the hidden live region alone carried was how every skip
  warning went unread.
- **Same-id campaign.** Incoming wins for `maps[]` exactly as for lore / party / presets;
  device-only maps of that campaign leave the list (their blobs stay as orphans, the class
  `deleteCampaign` already leaves).

#### Known limitations

Found by the code review of the shipped archive (PRs
[#44](https://github.com/beardedgm/WEB-Bestiary-and-Grimoire-PRD/pull/44),
[#46](https://github.com/beardedgm/WEB-Bestiary-and-Grimoire-PRD/pull/46) and
[#47](https://github.com/beardedgm/WEB-Bestiary-and-Grimoire-PRD/pull/47) fixed the rest).
These three are **open and deliberate** — each is recorded here rather than fixed because the
fix costs something the archive was built to avoid. Do not close one without deciding that
trade.

1. **A zip past 4 GB is written silently corrupt.** `packZipParts` stores central-directory and
   end-record offsets as `u32` and the entry count as `u16` (`lib/board-zip.js`), and export
   only *warns* above `ARCHIVE_MAX` (256 MB) — it never refuses. Beyond 4 GB of entry bytes the
   offsets wrap and the central directory points at garbage; the file still downloads, the
   stamp still updates, and the GM believes they hold a backup no unzipper can open. The fix is
   a hard export cap, which means refusing to export for a GM whose maps genuinely are that
   large — the opposite of what an archive is for. Zip64 support in `lib/board-zip.js` is the
   fix that costs nothing at the GM's end, and is the better answer if this ever bites.
2. **A failed pre-import flush discards unsaved map edits.** `replaceRecords`
   (`maps/maps-app.js`) does `await saveOpen().catch(() => {})`, closes the editor, then sets
   `dirty = false` unconditionally — so a flush that failed on quota is recorded as if it had
   succeeded, and nothing will retry it. `saveOpen`'s own toast fires but is easy to miss under
   the inert overlay. Fixing it needs a product decision the review could not make: block the
   import until the GM frees space, or proceed and tell them plainly that unsaved map edits
   were lost. Blocking is safer and more annoying; proceeding is the current behaviour minus
   the honesty.
3. **The confirm row can promise board media the caps will drop.** `counts.mediaAttached` sums
   re-inlined media across every board in the bag, but `BOARD.applyUserSave` then enforces
   `MAX_BOARDS` (40) and `MAX_BOARDS_PER_CAMPAIGN` (20). An archive with 25 boards for one
   campaign arms a row promising 25 media files and delivers 20. This is the one dialog whose
   whole purpose is stating exactly what an import will do, so the overstatement matters — but
   an exact count means simulating the board merge during parse, which is the kind of
   second-guessing of another module's rules that P1 Principle 7 exists to prevent. The honest
   cheap alternative is to say "up to N" and let the post-import message report the truth.

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

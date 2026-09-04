# Board — zip export/import — 2026-08-29

## Purpose

Explicit backup path for boards with embedded image/audio data URLs and large markdown notes.

## Format `bg-board-zip/1`

```
manifest.json     # { schema, title, exportedAt }
board.json        # vBoard; markdown bodies inline; media src as asset paths
assets/<id>.<ext> # binary from data: URLs
```

Filename: `*.bgboard.zip`

## Zip library

[`lib/board-zip.js`](../../lib/board-zip.js) — minimal STORE-method zip pack/unpack (no npm deps).
It also holds the shared media helpers `detachMedia` / `attachMedia` (data: URL ⇄ file) used by
this format and by the campaign archive (`bg-campaign-archive/1`,
[`2026-09-03-save-trust.md`](2026-09-03-save-trust.md)). `_mime` on a media card is part of
the format: the stashed mime of the extracted file. `unpackZip` checks local headers and entry
bounds and, with `{ verify: true }`, CRC-32.

## UI

Board session actions: **Export board…** and **Import board zip…** (active board only for v1 export).

Warn if zip blob > 50 MB before download.

## Acceptance

- Board with image + 60k markdown round-trips on clean profile
- Portable `bg-user-save/1` JSON path unchanged

**Amended 2026-09-04:** the shipped import validated the board before re-inlining assets, so
`vCard`'s `mediaSrc` blanked every `assets/…` path and media never survived a round-trip.
`attachMedia` now runs before `vBoard`, which is what the first acceptance line always
required.

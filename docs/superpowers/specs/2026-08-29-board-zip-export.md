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

## UI

Board session actions: **Export board…** and **Import board zip…** (active board only for v1 export).

Warn if zip blob > 50 MB before download.

## Acceptance

- Board with image + 60k markdown round-trips on clean profile
- Portable `bg-user-save/1` JSON path unchanged

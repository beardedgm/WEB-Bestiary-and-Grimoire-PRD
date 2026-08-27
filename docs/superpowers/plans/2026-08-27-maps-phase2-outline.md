# Maps (phase 2) — outline 2026-08-27

Start only after Campaign phase 1 is on `main`. Write a full implementation plan before coding.

## Locked

- **Maps** under active campaign; many maps per campaign
- Each map: background image + **hex** overlay + fog/tokens/tools (squares later)
- Local HexPlora-class features; no cloud/auth/share
- IndexedDB for image blobs + editor state; campaign `maps[]` meta in `bg.campaign.v1`
- Tokens: icons / labels / notes only (no Library links yet)
- Best-effort HexPlora / v1 JSON import; native export
- Feature bible: APP-Hexplora (local); persistence cousin: WEB-HexPlora IndexedDB

## Non-goals

Square overlay UI, Quest log, Audio board, share/QR, React HexPlora shell, stuffing multi‑MB maps into the 8 MB JSON portable save without a new format

## Deliverable when starting phase 2

A dated plan with a written **done checklist** of HexPlora-local tools, IDB schema, UI chrome, and import/export tests.

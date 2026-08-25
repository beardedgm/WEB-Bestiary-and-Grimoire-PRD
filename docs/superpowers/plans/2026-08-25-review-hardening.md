# Review hardening (2026-08-25)

## Changes

- Board `vCard` / `vBoard` on load, import, and export; strip `_preview*` and clamp media/`body`
- BUILD/BOARD `esc` quote-aware; portable save import **8 MB** + export oversize warning
- Import reports storage-write failures; pack drop replaces per-file via `packData` Map
- CI: `validate_schemas.py` + pinned `jsonschema==4.23.0`
- Converters skip `_`-prefixed scratch folders (same as `build_bundles.py`)

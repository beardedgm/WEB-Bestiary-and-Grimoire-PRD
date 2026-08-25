# Catalog filter chrome consistency (2026-08-25)

## Problem

Spell filter chips (`#f-extra`) stayed visible on Catalog Monsters because `.frow { display:flex }` overrode the UA `[hidden]` rule.

## Fix

- `#f-extra[hidden]{display:none !important}` and `.rng[hidden]{display:none !important}`
- Leaving Spells clears `F.extra` and resets chip pressed state in `applySideChrome`

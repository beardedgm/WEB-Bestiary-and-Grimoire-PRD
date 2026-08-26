# Forge mode (5e + PF2e)

Shipped: dedicated **Forge** header mode with separate D&D 5e (CR 0–30) and Pathfinder (levels −1…25 + damage band) creature builders. Live preview uses `monsterHTML`; **Save to Custom** goes through `normalizeCustomRecord` / `validateCustomRecord` / `upsertCustomRecord` with `TRK.confirmSwap` on id replace.

## Decisions

- Mode chip after Builder; `body.forge` full-bleed shell (rail | preview); no new localStorage draft key
- Tables inlined in the `FORGE` IIFE (no fetch) so `file://` / embedded `index.html` work
- No CR↔level conversion UI
- Paper Standards/Published PF2e toggle out of scope for v1

## Files

- `app.template.html` — chrome, CSS, `vUi`/`setMode`, `#forge` markup, `FORGE` script
- `PRODUCT.md`, `DESIGN.md`, `CLAUDE.md` — mode documentation

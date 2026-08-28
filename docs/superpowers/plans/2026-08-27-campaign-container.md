# Campaign container (phase 1) — 2026-08-27

**Status:** Shipped on `main` as of 2026-08-29. Implementation steps below are archival; see PRODUCT.md / specs for current behavior.


## Goal

First-class **Campaign** owns Party, Lore pages, Encounter presets, and an empty **maps** list. Header campaign picker; mode chips unchanged. Maps editor is phase 2.

## Store: `bg.campaign.v1`

```js
{
  activeCampaignId: string,
  campaigns: [{
    id: string,              // ≤64
    title: string,           // ≤80; migration default "My Campaign"
    system: "dnd5e" | "pf2e" | null,
    updatedAt: number,
    party: [ /* vParty members */ ],
    presets: [ /* vPresets entries */ ],
    lore: { pages: [ /* vPage */ ] },
    maps: []                 // phase 1: always []; reserved for Maps
  }]  // ≤20 campaigns
}
```

Caps: `MAX_CAMPAIGNS=20`, pages ≤200 per campaign (same as prior Lore).

## Ownership

| Data | Home |
|---|---|
| Party, presets, lore pages, maps[] | Active campaign in `bg.campaign.v1` |
| Customs | `bg.custom.records.v1` (Library) |
| Active enc, dice, ui, pd | `bg.trk.*` (Session) |
| Boards | `bg.board.v1` (Session) |
| Builder draft | `bg.builder.v1` global; Save writes presets into active campaign |

## Migration (one-shot)

If `bg.campaign.v1` missing:

1. Load `bg.lore.v1`, `bg.trk.party.v1`, `bg.trk.presets.v1`.
2. Lore has N campaigns → N campaign records; pages copied; party+presets attached only to lore’s `activeCampaignId` (or first).
3. No lore → one **My Campaign** with current party/presets and empty pages.
4. Persist `bg.campaign.v1`. Stop writing `bg.lore.v1` and stop persisting party/presets via standalone TRK keys (TRK mirrors active campaign; CAMPAIGN.save is source of truth). Read-fallback from legacy keys only during migration.

## Runtime

- `CAMPAIGN.active()` / `switchCampaign(id)` → set active, sync `TRK.state.party` + `presets`, refresh Lore UI, save; do not clear enc/dice.
- Party/preset mutations → update active campaign + persist.
- Lore page CRUD → `active().lore.pages` via CAMPAIGN.
- One header picker; Lore rail has no campaign New/Rename/Delete.

## Portable save

Extend `bg-user-save/1` with `campaigns` (+ `activeCampaignId`). Merge by campaign id (incoming wins same id). Old saves with only `lore`+`party`+`presets` migrate through the same one-shot rules on import.

## Non-goals (phase 1)

Maps editor, IndexedDB blobs, Library|Campaign|Session shell, Board under Campaign, Quest/Audio/Rules.

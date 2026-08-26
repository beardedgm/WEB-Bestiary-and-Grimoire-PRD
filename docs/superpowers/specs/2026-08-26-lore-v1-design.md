# Lore v1 (connected workflow, Phase 3)

Durable campaign knowledge base as a first-class mode. Extends the connected workflow so
prep can live in Lore and pin whole pages onto tonight’s Board as linked cards.

Parent: `docs/superpowers/specs/2026-08-26-connected-workflow.md`.

Constraints for this product: **local-only**, **static GitHub Pages** distribution — no
server, no accounts, no File System Access requirement. Persistence is `localStorage` plus
the existing portable `bg-user-save/1` path.

## Problem

Board markdown cards are session chrome, not a campaign archive. Without Lore, durable
adventure text stays in Notion/external wikis and the “create once, use everywhere” loop
breaks between prep and play. Phase 3 adds the home for campaign truth; Phase 4 will close
the capture loop back into it.

## Decisions (locked)

| Question | Choice |
|---|---|
| Storage | `localStorage` (`bg.lore.v1`); pages shaped as portable markdown documents |
| Organization | Folder **tree** (`parentId`) + freeform **tags** |
| Campaigns | **Multiple** named campaigns with an active picker |
| Pin to Board | **Whole page** linked card (`campaignId` + `pageId`) |
| Architecture | New **`LORE` mode + IIFE**, parallel to BOARD/FORGE |

## Data model

```js
// bg.lore.v1
{
  activeCampaignId: string,
  campaigns: [{
    id: string,          // ≤64
    title: string,       // ≤80
    updatedAt: number,
    pages: [{
      id: string,        // ≤64, stable
      title: string,     // ≤80
      parentId: string | null,  // null = root
      tags: string[],    // freeform; clamp count + length in vLore
      body: string,      // markdown; soft/warn/hard caps like Board notes
      updatedAt: number
    }]
  }]
}
```

- Validators (`vLoreState`, `vCampaign`, `vPage`) copy/clamp recognised fields and drop
  unknown junk (same untrusted-storage pattern as Board).
- Body is the source of truth — no parallel rich-doc format. Markdown shape stays export-
  friendly for a future “download `.md` tree” without rewriting the model.
- Portable save: include `lore` in `bg-user-save/1`; merge campaigns/pages by id (local-only
  kept on conflict — same as boards).
- Quotas: announce storage failures; oversized bodies follow Board markdown soft/warn/hard
  caps (reuse or share the same constants).

## Board integration

New Board card type `lore`:

```js
{ type: "lore", campaignId, pageId, /* shared card geometry/title */ }
```

- `vCard`: keep cards valid even when the page/campaign is missing; render an honest
  missing-page notice.
- `BOARD.addLorePage(campaignId, pageId)` → `{ ok, name?, error? }`.
- Not on the Board add rail.
- `cardHasSubstance` → `false` (re-creatable via Pin).
- Kind label: `lore`. Body: live markdown render (reuse Board’s markdown HTML path /
  read-aloud blockquotes). No edit-from-Board (Lore owns content).

## Surfaces

### Lore mode

- Header chip; `body.lore`; `vUi` / `setMode("lore")`; `LORE.setActive`.
- Rail: campaign picker (create / rename / delete with `TRK.confirmSwap`); page tree;
  New page / New child; tag filter + search.
- Main: title, tags, edit/preview toggle, **Pin to Board** (no mode switch; `announceLive`
  or Lore-local toast equivalent).
- Empty campaign: empty-state CTA to create the first page (optional light welcome page on
  first campaign create — implementer’s choice, keep minimal).

### Module boundary

- `window.LORE` IIFE; Script 1 / BOARD / TRK guard cross-module calls.
- Reuse existing markdown rendering where possible rather than forking a second parser.

## Edge cases

- Delete page with Board pins → cards remain; missing-page notice.
- Delete campaign → confirm; lore cards for that campaign miss.
- Duplicate pins of the same page → allowed.
- Broken `parentId` (orphan) → treat as root on load (validator repair).

## Non-goals (v1)

- Excerpt / block-level pin
- Capture from Board/Tracker into Lore (Phase 4)
- File System Access API, cloud sync, multiplayer
- Wiki `[[backlinks]]`, templates, live Library widgets inside pages
- Live Tracker mirroring on the Board (still deferred from Phase 2)

## Acceptance criteria

1. Create/switch campaigns; create nested pages; tag + filter; edit/preview markdown.
2. Pin page → Board `lore` card; reload and portable-save round-trip keep
   `{type:"lore", campaignId, pageId}`; deleted page → missing notice.
3. Mode toggle clean; works as static GitHub Pages / local-only (no server APIs).
4. Docs: PRODUCT, DESIGN, CLAUDE; workflow-spec integration checklist; plan note.

## Files (expected)

- `app.template.html` — Lore chrome/CSS/mode; `LORE` IIFE; Board `lore` card + `addLorePage`;
  portable save hooks
- `PRODUCT.md`, `DESIGN.md`, `CLAUDE.md`
- `docs/superpowers/specs/2026-08-26-connected-workflow.md` — mark Phase 3 criterion when
  shipped
- `docs/superpowers/plans/2026-08-26-lore-v1.md` — implementation plan (after this design)

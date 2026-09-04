---
target: portable Save / Export dialog
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:C:\\Users\\derri\\OneDrive\\Desktop\\claude\\WEB-Bestiary-and-Grimoire-PRD\\app.template.html#save-file"
timestamp: 2026-09-03T17-41-21Z
slug: app-template-html-save-file
closed: true
---
Method: dual-agent (A: 55f1b64a-4905-4d40-a0cf-adb71d5e33e4 · B: eb609371-fad7-46ca-a0f3-6c15858c57ba)

#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Export success / oversize warn live-only; dialog stays mute |
| 2 | Match System / Real World | 2 | Header Export hides import; Save file vs Export naming |
| 3 | User Control and Freedom | 3 | Cancel/Close OK; no undo after import; abort exits fully |
| 4 | Consistency and Standards | 2 | Export/Save/Import naming; Board zip & Maps Export not mirrored |
| 5 | Error Prevention | 2 | Confirm helps; Backup twin is fake; Maps omission silent |
| 6 | Recognition Rather Than Recall | 2 | Import behind Export; Board zip / Maps export not named |
| 7 | Flexibility and Efficiency | 1 | No shortcut, no selective export, no backup-then-import flow |
| 8 | Aesthetic and Minimalist Design | 2 | Dense hint + redundant Backup chip |
| 9 | Error Recovery | 2 | Schema jargon; 8 MMethod: dual-agent (A: 55f1b64a-4905-4d40-a0cf-adb71d5e33e4 · B: eb609371-fad7-46ca-a0f3-6c15858c57ba)

#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Export success / oversize warn live-only; dialog stays mute |
| 2 | Match System / Real World | 2 | Header Export hides import; Save file vs Export naming |
| 3 | User Control and Freedom | 3 | Cancel/Close OK; no undo after import; abort exits fully |
| 4 | Consistency and Standards | 2 | Export/Save/Import naming; Board zip & Maps Export not mirrored |
| 5 | Error Prevention | 2 | Confirm helps; Backup twin is fake; Maps omission silent |
| 6 | Recognition Rather Than Recall | 2 | Import behind Export; Board zip / Maps export not named |
| 7 | Flexibility and Efficiency | 1 | No shortcut, no selective export, no backup-then-import flow |
| 8 | Aesthetic and Minimalist Design | 2 | Dense hint + redundant Backup chip |
| 9 | Error Recovery | 2 | Schema jargon; 8 MB lacks Board-zip tip; partial fail OK |
| 10 | Help and Documentation | 2 | PRODUCT truths (Maps, 8 MB, Board zip) absent from dialog |
| **Total** | | **20/40** | **Acceptable** |

#### Design Specificity Verdict

**LLM assessment:** Partially The Game Table. Paper dialog, small-caps title, chips, and stone scrim fit Bestiary & Grimoire. The task composition is generic SaaS backup: one dense inventory paragraph plus three equal chips. Campaign ownership and the Board-zip / Maps-hexplora split do not appear on the surface — specificity is chrome, not teaching what you own.

**Deterministic scan:** `detect.mjs` exit 2, DEGRADED regex mode (htmlparser2 unavailable). 9 findings on whole `app.template.html`: side-tab×3, layout-transition×1, codex-grid-background×1, design-system-color×2 (`#8b2e2e`), design-system-radius×1 (`10px`), design-system-font-size×1 (`21px`). None are localized to the Save dialog markup (dialog is JS-templated). Likely FPs: spine/blockquote left borders, Board snap-grid. Real advisories elsewhere: width transition on maps drawer, raw `#8b2e2e` vs `--blood`, off-ramp radius/type.

**Visual overlays:** No reliable user-visible overlay. Browser MCP could not hold a navigable tab; live `detect.js` injection skipped. Fallback: CLI scan only; HTTP :8000 healthy.

#### Overall Impression

The confirm-before-import path is the right Operate instinct, but the dialog under-teaches a high-stakes backup. The single biggest opportunity: tell the truth about what Export does and does not include (especially Maps), then collapse the fake Backup twin and rename the entry point so Import is findable.

#### What's Working

1. Confirm-before-import with explicit encounter replace + same-id overwrite + local-only keep — correct high-stakes pattern.
2. Game Table shell: paper `.dlg`, small-caps title, chips, stone scrim.
3. Merge-by-id + atomic customs write; sparse success bits reward power users when `#trklive` is noticed.

#### Priority Issues

**[P0] Incomplete / dishonest backup scope (Maps)**
- **Why:** Hint lists Board and Lore but never says map pixels live outside the JSON (`bg-maps`). False “I backed everything up.”
- **Fix:** Two-line honest inventory: what JSON includes (maps meta only) + “Map images: Maps → Export. Large Board media: Board → Export board…”
- **Suggested command:** `/impeccable clarify`

**[P1] Header Export conceals Import**
- **Why:** Visible label fights the dual task. First-timers never find restore.
- **Fix:** Rename chip to Save or Backup; keep aria-label; or open export-first with Import clearly secondary.
- **Suggested command:** `/impeccable clarify`

**[P1] Export save ≈ Download backup first**
- **Why:** Same `downloadUserSave()`; Backup only adds a toast. False choice undermines pre-import safety.
- **Fix:** Remove Backup chip, or gate Import behind a real in-session download step.
- **Suggested command:** `/impeccable distill`

**[P2] Merge/replace wall + missing 8 MB / Board-zip guidance**
- **Why:** Hint says merges; confirm says overwrite. Cap and Board zip appear only on failure.
- **Fix:** Chunk “What you get” / “On import”; mention 8 MB and Board zip on Import path; align verbs.
- **Suggested command:** `/impeccable clarify`

**[P2] Flat action hierarchy (`chip go` inert in dialog)**
- **Why:** Primary Export looks like peers; only confirm Import gets `.chip.yes` weight.
- **Fix:** Style `.dlg .chip.go` like `.yes`, or separate Export primary / Import secondary rows.
- **Suggested command:** `/impeccable layout`

#### Persona Red Flags

**Alex (Power GM):** One-click export works; Backup twin wastes a scan; wipe+restore loses Maps; 8 MB after IDB inline is a landmine; no accelerator.

**Jordan (First-timer):** Opens Export, may never click Import; merges vs overwrite fear; never taught Board zip or Maps Export.

**Riley (Stress tester):** Double Export+Backup = twin downloads; oversize warn easy to miss; confirm Cancel closes whole overlay.

#### Minor Observations

- DESIGN.md documents the three-button Backup redundancy.
- Copy still says “Lore campaigns/pages” after campaign container.
- `alert()` if overlay not ready breaks confirmSwap convention.
- Detector hits are mostly outside this dialog; treat as background debt.

#### Questions to Consider

1. Should one control mean “everything for this campaign,” with Maps/Board zip as named exceptions?
2. Is Save file the product noun, while Export stays a Board/Maps verb?
3. Would a two-beat Backup → Restore wizard feel more Game Table than three chips?
4. What if Import were blocked until a current download completed in-session?

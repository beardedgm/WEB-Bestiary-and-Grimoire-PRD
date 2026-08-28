---
target: Lore mode
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
timestamp: 2026-08-27T02-27-24Z
slug: app-template-html
---
# Critique: Lore mode (`app.template.html`)

Method: dual-agent (A: d3bedd1c-926f-4efd-afb2-b30c095b229b · B: fe598a38-df1b-45fd-838c-83a25d3c773e)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Pin/save via SR-only live region; no Lore toast |
| 2 | Match System / Real World | 3 | GM language mostly fits; Quote ≠ read-aloud |
| 3 | User Control and Freedom | 2 | No Lore undo; Pin fire-and-forget |
| 4 | Consistency and Standards | 3 | Chips/md-view match; feedback ≠ Board toast |
| 5 | Error Prevention | 3 | Deletes confirmed; oversize fmt refused |
| 6 | Recognition Rather Than Recall | 3 | Chips labeled; Board destination not shown |
| 7 | Flexibility and Efficiency | 2 | Few accelerators; toolbar not roving |
| 8 | Aesthetic and Minimalist Design | 2 | Flat 11-chip wall; Pin≈Delete weight |
| 9 | Error Recovery | 3 | Clear deletes; silent Pin weak recovery |
| 10 | Help and Documentation | 1 | Empty state doesn't teach Pin/Quote loop |
| **Total** | | **24/40** | **Acceptable** |

## Design Specificity Verdict

**LLM:** Authored for Game Table (stone/paper, olive read-aloud, Pin to Board). Notebook IA is category-standard; character is in materials + Board loop, not composition.

**Detector:** Exit 2, 6 findings in DEGRADED regex mode. Lore-touching hit is olive blockquote `side-tab` (likely FP). Rest are Tracker/Board/Forge. Undercount on contrast.

**Overlays:** Not injected (live-server up; HTML mutation blocked). Puppeteer confirmed 11-chip `#loreFmt`, campaign select visual truncation.

## Overall Impression

Lore feels like the right book on the table once you're writing; the biggest miss is trust at Pin time and a format bar that shouts equally at Bold and Table.

## What's Working
1. Preview typography matches Board read-aloud (olive blockquotes).
2. Format bar hides cleanly in Preview.
3. Empty-state copy forks (no pages vs select a page).

## Priority Issues
### [P1] Invisible Pin/save feedback
Why: Sighted table-side GMs get no toast. Fix: Board-toast pattern for Lore. Commands: clarify, harden.

### [P1] Ungrouped 11-chip format wall
Why: Working-memory overload. Fix: group inline|block|insert; rename Quote. Commands: distill, layout.

### [P1] No narrow Lore layout
Why: Side-by-side rail crushes editor. Fix: stack/sheet like Board. Command: adapt.

### [P2] Pin ≈ Delete visual weight
Why: Primary action diluted. Fix: chip.go on Pin. Commands: layout, polish.

### [P2] Empty state doesn't teach Board loop
Why: Jordan never learns Pin/Quote. Fix: one-line onboard hint. Command: onboard.

## Persona Red Flags
Alex: few shortcuts, no tree DnD. Jordan: opaque New child, invisible Pin. Sam: tree `.on` without aria-current; SR-only status. Table-side GM: narrow crush, no glanceable Board target.

## Minor Observations
Edit textarea lacks sheet lift; char count as sole hint; Campaign 1 seed name; tree nesting is padding-only.

## Questions to Consider
If Pin is the promise, why is Delete peer-weighted? Should empty state sell tonight's Board? Is 11-chip chrome honest at the table?

---

**Archive note (2026-08-29):** Lore P1 items called out here (format bar, tree DnD, mobile sheet, Pin feedback) were largely addressed post-critique on `main`. Do not reopen as a feature track unless re-audited.

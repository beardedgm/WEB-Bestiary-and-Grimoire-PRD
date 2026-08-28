# Plan doc housekeeping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Align `docs/superpowers/plans/` with shipped reality so agents and humans do not treat stale `- [x]` boxes as open work.

**Architecture:** For each **shipped** plan, add a top-level **Shipped** blurb and replace unchecked implementation steps with a single “Completed in …” line or check them `[x]`. Do not rewrite history; link PR numbers where known.

**Tech Stack:** Markdown only. No code changes unless a plan references wrong file paths.

## Global Constraints

- Do not change behavior specs that are still accurate.
- Keep `docs/superpowers/specs/` as source of truth for acceptance criteria.
- One commit: `docs: mark shipped superpowers plans complete`.

---

### Task 1: Inventory shipped plans

- [x] **Step 1: Confirm shipped status** (grep for `Shipped:` at top)

| File | Shipped? |
|------|----------|
| `2026-08-15-level-filters.md` | Yes (in prod) |
| `2026-08-23-board-markdown-scale-and-tables.md` | Yes (v1 in `BOARD` IIFE; mark Tasks 1–5 `[x]`; **Out of scope** points to `2026-08-28-board-lore-storage.md`) |
| `2026-08-24-encounter-builder.md` | Yes |
| `2026-08-25-catalog-filter-chrome.md` | Yes |
| `2026-08-25-forge-mode.md` | Yes |
| `2026-08-25-review-hardening.md` | Yes |
| `2026-08-26-encounter-board-cards.md` | Yes (has Shipped section) |
| `2026-08-26-linked-board-cards.md` | Yes |
| `2026-08-26-lore-format-bar.md` | Yes |
| `2026-08-26-lore-tree-structure.md` | Yes |
| `2026-08-26-lore-v1.md` | Yes (header says Shipped; body has stale `[ ]`) |
| `2026-08-27-campaign-container.md` | Yes |
| `2026-08-27-critique-engineering-fixes.md` | Yes |
| `2026-08-27-maps-phase2.md` | Yes (matrix Done) |
| `2026-08-28-pf2e-out-of-band-zero-xp.md` | **Not shipped** — leave open |

---

### Task 2: Normalize each stale plan

For each file with unchecked steps but shipped header:

- [x] **Step 1: Add after title** (if missing):

```markdown
**Status:** Shipped on `main` as of 2026-08-28. Implementation steps below are archival; see PRODUCT.md / specs for current behavior.
```

- [x] **Step 2: Bulk-replace** `- [x]` → `- [x]` in implementation sections only (not in “Out of scope” or “Non-goals”)

Files needing this most:

- `2026-08-26-lore-v1.md`
- `2026-08-26-encounter-board-cards.md`
- `2026-08-15-level-filters.md`
- `2026-08-23-board-markdown-scale-and-tables.md` (mark Tasks 1–5 `[x]`; leave **Out of scope (follow-up plans)** pointing to `2026-08-28-board-lore-storage.md`)

---

### Task 3: Cross-links

- [x] **Step 1:** Add to `docs/superpowers/plans/2026-08-27-maps-phase2.md` deferred section:

```markdown
Follow-ups: `2026-08-28-maps-phase3-deferred.md`
```

- [x] **Step 2:** Add to `docs/superpowers/specs/2026-08-26-connected-workflow.md` after Phases 0–3:

```markdown
## Post-phase backlog

See `docs/superpowers/plans/2026-08-28-backlog-roadmap.md`.
```

- [x] **Step 3:** Delete duplicate stub `docs/superpowers/plans/2026-08-25-pf2e-out-of-band-zero-xp.md` if present; canonical plan is `2026-08-28-pf2e-out-of-band-zero-xp.md`.

- [x] **Step 4:** Add one-line note to `.impeccable/critique/2026-08-27T02-27-24Z__app-template-html.md` (or archive) that Lore P1 items were largely addressed post-critique — **do not** reopen as a feature track unless re-audited.

**Status:** Shipped on `main` as of 2026-08-29.

---

### Task 4: Verify

- [x] No plan with **Shipped** header still has unchecked steps in its task sections (except intentional follow-up sections)
- [x] Roadmap links resolve
- [x] `git diff --stat` is docs-only

---

## Non-goals

- Rewriting specs into plans
- Adding completion dates to every line of historical tasks
- Moving plans to a different directory

# PF2e out-of-±4 at 0 XP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Status:** Shipped on `main` as of 2026-08-29. Implementation steps below are archival; see PRODUCT.md / specs for current behavior.


**Goal:** Allow PF2e Encounter Builder to add creatures outside party level ±4; they cost **0 XP** toward the budget and show an honest **Outside ±4** label on the roster.

**Architecture:** Keep `pf2eCreatureCost()` unchanged (`ok: false` for `out-of-range`). Teach `tryAdd`, `lineCost`, `spendSummary`, and `renderRoster` to treat out-of-range as **priced at zero**, not blocked. Expose helpers on `BUILD._test` for console checks.

**Tech Stack:** Vanilla JS in `app.template.html` (`BUILD` IIFE). Rebuild `index.html` via `build_bundles.py`. No schema changes.

## Global Constraints

- Edit **`app.template.html` only**; rebuild with `python3 build_bundles.py`.
- Still **block** missing level and missing HP (unchanged).
- No Paper roles/combos; no CR↔level conversion.
- PF2e in-band creatures must behave exactly as today.
- Run `python3 build_bundles.py --check` and `python3 check_inline_scripts.py` before PR.

---

### Task 1: Allow add for out-of-range PF2e creatures

**Files:**
- Modify: `app.template.html` — `BUILD` IIFE, `tryAdd` (~6808)

**Interfaces:**
- Consumes: `pf2eCreatureCost`, `creatureLevel`, `canFormCombatant`
- Produces: `tryAdd` allows `reason === "out-of-range"` through to roster push

- [x] **Step 1: Remove the hard block in `tryAdd`**

Replace the out-of-range branch so only `missing-level` blocks:

```javascript
    if (draft.system === "pf2e"){
      const c = pf2eCreatureCost(draft.partyLevel, creatureLevel(r));
      if (!c.ok && c.reason !== "out-of-range"){
        status("Missing level — can’t add “" + r.name + "”.", true); return false;
      }
    } else if (creatureXp(r) == null){
```

- [x] **Step 2: Rebuild and syntax-check**

```bash
python3 build_bundles.py
python3 check_inline_scripts.py
```

Expected: exit 0.

- [x] **Step 3: Manual smoke**

Builder → PF2e → party level 10 → add a level −1 or level 15 creature from Catalog. Expected: adds to roster (may show wrong meta until Task 2).

---

### Task 2: Price out-of-range lines at 0 XP

**Files:**
- Modify: `app.template.html` — `lineCost` (~6708), `renderRoster` (~6958)

**Interfaces:**
- Consumes: `pf2eCreatureCost` (unchanged)
- Produces: `lineCost` returns `{ ok: true, unit: 0, total: 0, unpriced: true, reason: "out-of-range" }` for out-of-range PF2e lines

- [x] **Step 1: Extend `lineCost`**

After `const c = pf2eCreatureCost(...)` inside the PF2e branch:

```javascript
      if (!c.ok && c.reason === "out-of-range"){
        return {
          ok: true, reason: "out-of-range", unpriced: true,
          unit: 0, total: 0, name: r.name, delta: c.delta,
        };
      }
      if (!c.ok) return { ok: false, reason: c.reason, unit: 0, total: 0, name: r.name, delta: c.delta };
```

- [x] **Step 2: Update `renderRoster` meta string**

```javascript
      const meta = c.ok
        ? (c.unpriced
          ? ("Outside ±4 · 0 XP × " + ln.qty)
          : (c.unit.toLocaleString() + " XP × " + ln.qty))
        : (c.reason || "invalid");
```

- [x] **Step 3: Rebuild + manual smoke**

Party level 10 + level 15 creature: meter **Spent** unchanged; roster shows **Outside ±4 · 0 XP × 1**. In-band Severe still spends correctly.

---

### Task 3: Docs and PRODUCT alignment

**Files:**
- Modify: `PRODUCT.md` — Builder capabilities bullet (~line 44)
- Modify: `docs/superpowers/plans/2026-08-24-encounter-builder.md` — Locked decisions PF2e line
- Delete or supersede: `docs/superpowers/plans/2026-08-25-pf2e-out-of-band-zero-xp.md` (stub)

- [x] **Step 1: PRODUCT.md**

Change PF2e Builder line from “PF2e ±4 block” to “PF2e ±4 band for XP; outside band adds at 0 XP with label”.

- [x] **Step 2: encounter-builder plan**

Add **Shipped** note at top referencing this plan; strike the “block” locked decision.

---

### Task 4: Console helpers (optional but recommended)

**Files:**
- Modify: `app.template.html` — `BUILD._test` export (~7170)

- [x] **Step 1: Document console checks in plan PR body**

```javascript
BUILD._test.pf2eCreatureCost(10, 15)   // { ok: false, reason: "out-of-range", ... }
BUILD._test.lineCost   // not exported today — add if useful:
```

Add `lineCost` to `_test` only if not already reachable; keep surface minimal.

---

## Acceptance checklist

- [ ] PL10 + L−1: add OK, 0 XP spent, budget unchanged, roster label **Outside ±4**
- [ ] PL10 + L15: same
- [ ] PL10 + L12 Severe: XP cost unchanged vs pre-change
- [ ] Missing level: still blocked
- [ ] Missing HP: still blocked
- [ ] Save to Encounters + Load into Tracker: out-of-range lines still form combatants
- [ ] CI: `build_bundles.py --check`, `check_inline_scripts.py`

## Non-goals

- Changing PF2e cost table or ±4 band definition
- Warning banner in meter for unpriced lines (roster label is enough for v1)
- 5e out-of-band behavior (unchanged)

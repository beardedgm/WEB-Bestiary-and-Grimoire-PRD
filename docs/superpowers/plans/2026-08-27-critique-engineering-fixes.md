# Critique engineering fixes (2026-08-27)

**Status:** Shipped on `main` as of 2026-08-29. Implementation steps below are archival; see PRODUCT.md / specs for current behavior.


Hardening pass from the adversarial review at `87b218b3`.

## Shipped

- **Global IDs:** PF2e CRB Unseen Servant creature → `pf2e:crb:unseen-servant-creature`; spell keeps `pf2e:crb:unseen-servant`. `ID_INDEX` skips duplicates loudly; `validate_schemas.py` fails on cross-bundle collisions.
- **Mobile sheets:** ≤760px Board/Lore toggles use `#board` / `#lore` in the selector chain so they beat base `display:none`.
- **Mode bar:** ≤760px header actions full-width; `#mode` can wrap without page horizontal scroll.
- **Board persistence:** Caps enforced before add/new/dup; markdown/checklist/random gated in UI; live `save()` uses `{ live: true }` (no silent card drops; timers snapshot displayed value); import still clamps with toast.
- **Encounter saves:** `savePreset` / `savePresetFull` return `{ ok, … }` and roll back in-memory on storage failure; callers announce success only when `ok`.
- **Builder:** empty 2024 roster classifies as `none` → **None**.
- **CI:** uniqueness in `validate_schemas.py`; `check_inline_scripts.py` + `node --check` in workflow.

## Manual smoke

- Unseen Servant spell → Board shows spell; creature → creature
- 320 / 390 / 760: Board & Lore sheet toggles; all six modes + Export reachable
- Board at card/board caps; oversize note refused; running timer → reload preserves displayed time
- Empty 2024 Builder → Difficulty None; forced storage failure → no false “Saved”

# 001 — Animate mobile Board/Lore rail sheets

- **Status**: DONE
- **Commit**: `4a779828` (plan written); implemented on `feat/001-mobile-rail-sheet-slide`
- **Severity**: MEDIUM
- **Category**: Missed opportunities (spatial consistency / preventing a jarring change)
- **Estimated scope**: 2 files (`app.template.html`, briefly `DESIGN.md`); CSS + tiny reduced-motion extension; no new JS required if the open class pattern is preserved

## Problem

On viewports ≤760px, Board and Lore open their side rails as bottom sheets by flipping `display: none` ↔ `display: flex` / `block` when `body` gains `board-rail-open` or `lore-rail-open`. The sheet and scrim **teleport** — there is no enter/exit motion, so the surface feels disconnected from the floating toggle that opened it.

Current mobile CSS (`app.template.html` ~1337–1362):

```css
@media (max-width:760px){
  body.board .board-rail-toggle{display:inline-flex; align-items:center; justify-content:center}
  body.board .board-rail{
    display:none; position:fixed; left:0; right:0; bottom:0; width:100%; max-height:min(72vh, 640px);
    z-index:41; border-right:0; border-top:1px solid var(--hair);
    box-shadow:0 -10px 32px -12px rgba(36,33,28,.35);
    padding-bottom:max(8px, env(safe-area-inset-bottom, 0px))}
  body.board.board-rail-open .board-rail{display:flex}
  body.board.board-rail-open .board-rail-scrim{display:block}
  body.board.board-rail-open .board-rail-toggle{display:none}

  body.lore .lore-rail-toggle{display:inline-flex; align-items:center; justify-content:center}
  body.lore .lore-rail{
    display:none; position:fixed; left:0; right:0; bottom:0; width:100%; max-height:min(72vh, 640px);
    z-index:41; border-right:0; border-top:1px solid var(--hair);
    box-shadow:0 -10px 32px -12px rgba(36,33,28,.35);
    padding-bottom:max(8px, env(safe-area-inset-bottom, 0px))}
  body.lore.lore-rail-open .lore-rail{display:flex}
  body.lore.lore-rail-open .lore-rail-scrim{display:block}
  body.lore.lore-rail-open .lore-rail-toggle{display:none}
}
```

Scrim base (Board ~1193–1194, Lore ~1332–1335) is also `display:none` until open.

JS only toggles body classes (keep this):

```js
// app.template.html ~6182–6186
function setBoardRailOpen(open){
  document.body.classList.toggle("board-rail-open", !!open);
  const toggle = document.getElementById("boardRailToggle");
  if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
}

// app.template.html ~8474–8478
function setLoreRailOpen(open){
  document.body.classList.toggle("lore-rail-open", !!open);
  const toggle = document.getElementById("loreRailToggle");
  if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
}
```

`:root` today has **no** motion easing tokens (`app.template.html` ~8–32). Existing motion uses weak built-in `ease-out` (e.g. `.sb` `lay` at `.14s ease-out`, `.board-toast` opacity `.2s`).

## Target

1. Add shared motion tokens on `:root`:

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

2. On **≤760px only**, stop using `display` to show/hide the sheet and scrim. Keep the rail `display:flex` (and scrim present) while `body.board` / `body.lore` is active on that breakpoint, and drive open/closed with **`transform` + `opacity`/`visibility` + `pointer-events`** so CSS **transitions** can run (interruptible; no keyframes).

Exact closed → open values:

| Surface | Closed | Open | Transition |
| --- | --- | --- | --- |
| `.board-rail` / `.lore-rail` | `transform: translateY(100%)`; `visibility: hidden`; `pointer-events: none` | `transform: none`; `visibility: visible`; `pointer-events: auto` | `transform 280ms var(--ease-drawer)`; delay `visibility` until end when closing (`visibility 0s linear 280ms` closed, `0s` when open) |
| `.board-rail-scrim` / `.lore-rail-scrim` | `opacity: 0`; `visibility: hidden`; `pointer-events: none` | `opacity: 1`; `visibility: visible`; `pointer-events: auto` | `opacity 200ms var(--ease-out)`; same visibility-delay pattern (`200ms` when closing) |

Exit path must be the same edge (slide down / fade out) — toggle open/close rapidly must retarget mid-transition (transitions, not keyframes).

3. Desktop (≥761px) behavior **unchanged**: side rail stays a normal column (`#board .board-rail` / `#lore .lore-rail` existing flex column rules). Do not apply `translateY` outside the mobile media query.

4. Reduced motion — extend the existing targeted block (`app.template.html` ~455–462):

```css
@media (prefers-reduced-motion:reduce){
  /* existing rules stay */
  .sb{animation:none}
  #filters > summary::before,
  #dice > summary::before,
  .col-resize::after,
  .board-toast{transition:none}

  /* add — sheet: no slide; scrim may keep a short opacity fade */
  body.board .board-rail,
  body.lore .lore-rail{
    transition:none;
    transform:none;
  }
  body.board:not(.board-rail-open) .board-rail,
  body.lore:not(.lore-rail-open) .lore-rail{
    visibility:hidden;
    pointer-events:none;
  }
  body.board .board-rail-scrim,
  body.lore .lore-rail-scrim{
    transition:opacity .15s var(--ease-out), visibility 0s linear .15s;
  }
}
```

When reduced-motion and closed, rails must not sit off-screen and intercept hits — `visibility`/`pointer-events` still gate interaction. Prefer **no translate**; open/closed is visibility (+ optional scrim opacity).

5. Toggle visibility rules stay as today: show toggle when sheet closed on mobile; hide toggle when open (`body.*.*-rail-open .*-rail-toggle{display:none}`).

## Repo conventions to follow

- **Stack**: vanilla HTML/CSS/JS in one template; no Motion/Framer. Prefer CSS transitions.
- **Edit surface**: `app.template.html` only for behavior/CSS; run `python3 build_bundles.py` so `index.html` matches (build artifact).
- **Motion personality**: Operate / Game Table — sparse, functional (see `DESIGN.md` “Motion is sparse…”). Drawer curve is appropriate for occasional mobile sheets; do not add bounce.
- **Reduced motion**: targeted rules only — never a global `animation-duration: 0.01ms` kill (already documented).
- **Exemplar to imitate**: `.board-toast` / `.pdtoast` class-driven show state + `transition` on `opacity`/`transform`, plus the existing `@media (prefers-reduced-motion:reduce)` block at ~455.

## Steps

1. **Tokens** — In `app.template.html` `:root { … }` (after `--radius` / fonts is fine), add:

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

2. **Mobile Board sheet** — Inside `@media (max-width:760px)`, replace the Board rail/scrim open rules so that when `body.board`:
   - `.board-rail` is `display:flex` (not `none`) with the fixed bottom-sheet geometry already present.
   - Closed (no `board-rail-open`): `transform: translateY(100%)`; `visibility: hidden`; `pointer-events: none`; transition as in Target.
   - Open (`body.board.board-rail-open`): `transform: none`; `visibility: visible`; `pointer-events: auto`.
   - `.board-rail-scrim`: on mobile under `body.board`, use `display: block` always (override base `display:none`), opacity/visibility/pointer-events as in Target.
   - Keep `body.board.board-rail-open .board-rail-toggle{display:none}` and toggle `display:inline-flex` when Board mode on mobile.

3. **Mobile Lore sheet** — Mirror step 2 for `.lore-rail` / `.lore-rail-scrim` / `lore-rail-open` with the **same** durations and tokens (parity between modes).

4. **Reduced motion** — Extend `@media (prefers-reduced-motion:reduce)` per Target §4. Do not strip scrim opacity feedback entirely if an open state remains; do strip sheet `translateY`.

5. **DESIGN.md** — In the Lore/Board mobile sheet bullet(s), add one sentence that ≤760px rails **slide up from the bottom** (280ms drawer ease) with scrim fade, and reduced-motion drops the slide. Do not rewrite unrelated DESIGN sections.

6. **Build** — From repo root: `python3 build_bundles.py` then `python3 build_bundles.py --check` so `index.html` matches the template.

7. **Do not change** `setBoardRailOpen` / `setLoreRailOpen` signatures or call sites unless a step fails without a one-line class toggle — prefer pure CSS. No new dependencies.

## Boundaries

- Do NOT animate desktop (wide) rails, mode chips, `#trkovl`, `#boardExpand`, `#spellpeek`, or `.board-toast` in this plan.
- Do NOT introduce keyframes for open/close.
- Do NOT animate `height`/`top`/`bottom` for the sheet — `transform: translateY(100%)` only (percentage = element height).
- Do NOT change Board/Lore business logic, card ops, or tree DnD.
- Do NOT add a motion library.
- If line numbers drift past `4a779828`, re-find the `@media (max-width:760px)` Board/Lore rail block and `:root`; STOP and report if the open pattern is no longer class-based on `body`.

## Verification

- **Mechanical**: `python3 build_bundles.py --check` exits 0; `index.html` contains `--ease-drawer` and `translateY(100%)` for mobile rails.
- **Feel check** (DevTools device ≤760px width, or a phone):
  - Board → tap **Cards & sessions**: sheet rises from the bottom edge; scrim fades in; toggle hides while open.
  - Tap scrim / Escape path if any: sheet slides **down** the same edge; no pop-cut.
  - Spam open/close: motion retargets mid-slide (no restart from a keyframe zero).
  - Animations panel at ~10% playback: confirm ~280ms sheet, ~200ms scrim, ease starts fast (drawer/out), not slow-start `ease-in`.
  - Lore → **Campaigns & pages**: same motion language as Board.
  - Width ≥761px: Board/Lore rails remain normal side columns; no off-screen translate.
  - Rendering → `prefers-reduced-motion: reduce`: sheet does not slide; open/close still usable; no stuck invisible hit-target covering the stage.
- **Done when**: mobile open/close is transition-driven on transform/opacity; desktop unchanged; reduced-motion handled; build check passes; DESIGN mentions the sheet slide once.

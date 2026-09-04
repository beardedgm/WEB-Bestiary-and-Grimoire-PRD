# Connected improvements roadmap — 2026-09-03

**Status:** Specs stubbed (revised after second code review); implementation not started.
Ship phases as separate PRs.

**Amended 2026-09-03:** P3, P7 and P8 specs revised after a plan review against the code.
Each named a helper or API that does not exist in the shape the spec assumed; the required
work is now scoped in the spec rather than left to be discovered mid-implementation. P2's
Problem statement was also amended after a code review found two live defects in the Save
dialog it described as already shipped (fixed separately; P2 scope unchanged).

Extends the connected workflow ([`2026-08-26-connected-workflow.md`](../specs/2026-08-26-connected-workflow.md)).
Replaces ad-hoc post-Maps improvement mode with a sequenced program: **one campaign, many
verbs on the same objects**. Competitors inform metrics and one lesson each — not feature
parity.

Parent backlog pointer: [`2026-08-28-backlog-roadmap.md`](2026-08-28-backlog-roadmap.md).

---

## Principles (bind all phases)

1. Prefer **bridges** over deeper single-mode chrome.
2. Respect ownership: Lore = adventure text; Board = tonight; Tracker = live combat;
   Maps blobs = separate export.
3. Closed non-goals stay closed: Board/Tracker → Lore **automation**, Maps as VTT, cloud
   sync, CR↔level conversion.
4. **Explicit** Board markdown → Lore **copy** (P8) is allowed; auto-capture is not.
   Framing is “Copy to Lore…,” not archive/promote of tonight’s session.
5. Drag/drop is **out** until after P1 ships and is verified.
6. Operate / Game Table visual constraints hold — no Beyond-dense list rows.
7. Normalize **discoverability and action policy**, not application ownership — modules keep
   owning operations via guarded public APIs (`window.TRK`, `BUILD`, `BOARD`, `LORE`, …).

## Locked interaction defaults

| Decision | Choice |
|----------|--------|
| Primary UI | Contextual primary chip + secondary actions in a consistent overflow (`⋯`) or same chip row when ≤2 actions |
| Verb vocabulary | `Open` · `Board` · `Builder` · `Tracker` · `Maps` · `Copy` (P8 only: “Copy to Lore…”) |
| Action layer | Thin `actionsFor(subject, context)` → UI descriptors; no event bus, DI, or giant dispatcher |
| Save archive | Map/media stay out of `bg-user-save/1`; full campaign zip is **P2b**, not stuffing the 8 MB JSON |

## Object → verb matrix (P1 target)

| Object | Open | Board | Builder | Tracker | Maps | Copy |
|--------|------|-------|---------|---------|------|------|
| Monster / custom | yes | Send | Add (when build) | Add (when track / qty) | — (P6) | — |
| Spell | yes | Send | — | — | — | — |
| Encounter preset | Open/Load | Send | Open in Builder | Load | — | — |
| Lore page | yes | Pin | — | — | — | — |
| Board markdown | Expand | — | — | — | — | P8 Copy to Lore… |
| Map | Open Maps | — | — | — | — | — |

Context picks **one** primary (e.g. in Builder, monster primary = Builder).

---

## Phase table

| Phase | Name | Metric | Spec | Depends on |
|-------|------|--------|------|------------|
| **P1** | Action consistency | Time from “I need this creature” to it landing in Builder / Tracker / Board | [`2026-09-03-object-action-matrix.md`](../specs/2026-09-03-object-action-matrix.md) | — |
| **P2** | Save finishing polish | GM sees when they last downloaded a portable save (not proof the file still exists) | [`2026-09-03-save-trust.md`](../specs/2026-09-03-save-trust.md) | Scope copy already shipped |
| **P2b** | Campaign archive zip | Recovery story for map/media blobs | same spec (Track B) | P2 |
| **P3** | Builder remaining → Library fit | Time to answer “what if I add one more?” | [`2026-09-03-builder-library-fit.md`](../specs/2026-09-03-builder-library-fit.md) | P1 recommended |
| **P4** | Recent combat events | Look away 30s, look back, know round / current / next / HP / markers + what just happened | [`2026-09-03-tracker-glance.md`](../specs/2026-09-03-tracker-glance.md) | — |
| **P5** | Resume Board | After two weeks, “where was I?” without a dashboard | [`2026-09-03-campaign-resume.md`](../specs/2026-09-03-campaign-resume.md) | `bg.board.lastOpen.v1` (shipped) |
| **P7** | Forge roles / band-first UI | Time from “level-8 undead brute” to usable block | [`2026-09-03-forge-roles.md`](../specs/2026-09-03-forge-roles.md) | — |
| **P6** | Maps linked tokens | Fewer tool changes during exploration | [`2026-09-03-maps-linked-tokens.md`](../specs/2026-09-03-maps-linked-tokens.md) | P1 recommended; **intentional scope expansion** |
| **P8** | Copy Board note to Lore | Session note can become adventure text without breaking ownership | [`2026-09-03-board-promote-to-lore.md`](../specs/2026-09-03-board-promote-to-lore.md) | Board + Lore stable |

### Suggested ship order

**P1 → P2 → P3 → P4 → P5 → P7 → P6 → P8** (P2b when archive format is fully specified).

P7 ships before P6: Forge improves an existing core workflow; linked map tokens reopen a
documented Maps non-goal and add coupling.

Each phase: design spec sign-off → implement → browser verify against its metric → PR.

---

## Phase summaries

### P1 — Action consistency

Thin `actionsFor(subject, context)` returns UI/action descriptors (label, primary flag,
handler reference). A small render helper paints primary chip + overflow. **Operations stay
owned** by `TRK` / `BUILD` / `BOARD` / `LORE` (fold discoverability of `addSendToBoard`,
Table Load/Open/Send, Builder Load, Lore Pin — not ownership). Same labels everywhere.
No drag. No bus / DI / dispatcher.

**Primary files:** `app.template.html` (Script 1 + call sites).

### P2 — Save finishing polish

Honest scope copy is already shipped (JSON vs Maps Export vs Board zip; import encounter
warning; partial persistence honesty). Remaining work:

- Persist timestamp on successful Download; show **“Last downloaded save: …”** or
  **“Last portable export: …”** (never “backup” — a timestamp does not prove the file exists).
- Brief Maps-images-exported-separately reminder if useful.

**P2b (later):** Full campaign archive (JSON + map/media blobs)—new format; do not enlarge
`bg-user-save/1` past 8 MB.

**Primary files:** `app.template.html` (`openUserSaveDialog`, `downloadUserSave`).

### P3 — Builder remaining → Library fit

When `body.build`, Library chip **Fits remaining** calls `BUILD.fits(ref)`:
simulate draft + one candidate → run **existing** Builder spend math → `spent <= budget`.
Never independent Library XP ≤ remaining arithmetic (breaks 2014 multipliers; mis-fits
PF2e outside-±4 at 0 XP).

Two constraints now locked in the spec: `spendSummary()` takes no arguments and reads the
module-scoped `draft`, so P3 first gives it an explicit state parameter (simulating by
mutating and restoring the live draft is out); and because `refresh()` filters all 9,339
records per keystroke, the per-refresh half of the math must be hoisted out of the
per-candidate loop.

**Primary files:** `app.template.html` (BUILD + Library filters).

### P4 — Recent combat events

Stronger current/next hierarchy. Tiny event strip from **semantic** metadata passed into
`mutate(fn, meta)` (e.g. damage amount/target) — **not** undo-snapshot diffs.
**In-memory** 10–20 event ring (table-speed awareness); does not survive refresh; not a
combat log / export surface. No rules automation.

**Primary files:** `app.template.html` (TRK).

### P5 — Resume Board

Header/campaign picker: **Continue Board: {title}** from existing `bg.board.lastOpen.v1`.
v1 does not pick “most recent surface” across Board vs Maps. Not a Campaign mode.

**Primary files:** `app.template.html` (CAMPAIGN header).

### P7 — Forge roles / band-first UI

Role presets as Extreme/High/Moderate/Low distributions across defenses/offense; intent
chips primary, numbers secondary; 5e translated carefully (no fake PF2e identity). Ships
before P6.

Now carries a hard rule: the PF2e branch fabricates `abilityMods` (five zeros plus a
`wisGuess` derived from Perception) on records whose own `parse.warnings` say ability scores
are unstated. That breaks the "never compute a value the source didn't state" invariant, and
the schema already allows `null`. P7 fixes it — the 5e branch is honest and stays as is.

**Primary files:** `app.template.html` (FORGE).

### P6 — Maps linked tokens (intentional scope expansion)

**Decision:** Reopen Library-linked Maps tokens because the connected-object model now
makes the benefit worth the coupling. Previously an explicit non-goal in Maps backlog /
token-grid specs.

Optional `ref` on token (Library id) — not copied monster state. Open record / Send to
Tracker / locate combatant as needed for spatial adjudication. Revive Track E from
[`2026-08-28-maps-phase3-deferred.md`](2026-08-28-maps-phase3-deferred.md). Not VTT.

**Primary files:** `maps/maps-app.js`, `app.template.html` (MAPS bridges).

### P8 — Copy Board note to Lore

User-initiated **Copy to Lore…** on Board markdown: hydrate IDB body if needed → new Lore
page under active campaign → choose parent chapter → copy title + markdown. Board original
stays; no sync afterward. Uses a real `LORE` creation API (Board does not mutate Lore
internals). **Not** auto capture; **not** “Promote” / session archive into Lore.

That API does not exist yet — `LORE` exposes no page creation, and the internal `newPage`
focuses the title field, so Board cannot call it. P8 adds a headless `LORE.createPage`
returning a `BOARD.addRecord`-style result object, and refactors `newPage` onto it.

**Primary files:** `app.template.html` (BOARD + LORE / CAMPAIGN lore pages).

---

## Program non-goals

- New app modes
- Drag-and-drop object routing (until after P1)
- Cloud accounts or sync
- Stuffing map blobs into `bg-user-save/1`
- Board/Tracker → Lore automation
- Event bus / DI / central dispatcher for cross-module ops
- Persistent Foundry-style combat log (P4 is ephemeral awareness only)
- Becoming a VTT / Foundry-style rules automation
- CR↔level conversion

---

## Checklist (implementation)

- [ ] P1 Action consistency (`actionsFor`)
- [ ] P2 Save finishing polish (last downloaded save)
- [ ] P2b Campaign archive
- [ ] P3 Builder ↔ Library fit (`BUILD.fits` simulation)
- [ ] P4 Recent combat events (semantic, ephemeral)
- [ ] P5 Resume Board
- [ ] P7 Forge roles
- [ ] P6 Maps linked tokens (scope expansion)
- [ ] P8 Copy Board note to Lore

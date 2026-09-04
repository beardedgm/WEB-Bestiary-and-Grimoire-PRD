# Bestiary & Grimoire — Product Intent

> **Bestiary & Grimoire is a local-first GM operating system that connects campaign preparation
> directly to running the game at the table.**

This document explains **why the product exists** and how to judge whether a proposed feature
belongs in it.

It deliberately does not restate the rules other documents already own. Where a principle has a
home, this document names it in one line and points there:

| Document | Owns |
|---|---|
| `PRODUCT.md` | Scope, users, capabilities, constraints, and the operative **Product Principles** list |
| `README.md` | The data model, schema reasoning, `parse` semantics |
| `DESIGN.md` | Design tokens and the named visual rules |
| `docs/superpowers/specs/2026-08-26-connected-workflow.md` | Area ownership, the integration contract, non-goals |
| `docs/superpowers/{specs,plans}/` | Per-feature design and shipped behaviour |

**This document does not override any of them.** When it and `PRODUCT.md` appear to disagree,
`PRODUCT.md` is correct and this file needs fixing.

## Core intent

Bestiary & Grimoire exists to reduce the friction between **preparing a tabletop RPG campaign** and
**running that campaign at the table**.

A GM should not have to maintain the same creature in several places, rebuild an encounter when
combat starts, copy notes between prep and session tools, or hunt through disconnected applications
for information they already prepared.

The application therefore treats preparation and play as one continuous workflow. The short internal
rule is:

> **Prep should become play without re-entry.**

A creature found or created during prep should remain the same creature when it is placed in an
encounter, staged for a session, referenced from a map, or opened during combat. An encounter built
before the session should be the encounter loaded into the Tracker. Adventure material prepared in
Lore should be available when that scene is being run.

The app should make the distance between **"I need this"** and **"I am using it"** as small as
possible.

## Who it is for

The primary user is the **Game Master** running D&D 5e or Pathfinder 2e, moving between two states.

**Preparing** — What exists? What should the party fight? What should I create? What happens next?
Where does it happen? What will I probably need during the session?

**Running** — What is happening mechanically right now? What do I need in front of me? Where is
everyone? What did I prepare that I need now?

The product should support both without making the GM rebuild context when moving between them.

## One campaign, several perspectives

The application has seven modes, but they are not seven tools sharing a navigation bar. They are
different views of one campaign and the same reusable objects. Each answers a different question:

- **Library** — *"What exists?"* The searchable corpus of monsters and spells, including customs.
- **Builder** — *"What should they fight?"* Composes Library creatures into encounters under the
  selected game's rules.
- **Forge** — *"What should I create?"* Makes new creatures that become normal Library content.
- **Lore** — *"What happens?"* The campaign's durable adventure and module text.
- **Maps** — *"Where are they?"* Spatial campaign state for exploration and positioning.
- **Board** — *"What do I need in front of me tonight?"* A curated session surface, not the campaign
  database.
- **Tracker** — *"What is happening mechanically right now?"* Live combat state.

Two supporting surfaces are not modes: **Campaign** (the header picker) supplies the context that
scopes durable material, and **Save** provides portability and recovery — it is not another
workspace.

Which mode *owns* what, and what each explicitly does not own, is the **Area ownership** table in
[`2026-08-26-connected-workflow.md`](docs/superpowers/specs/2026-08-26-connected-workflow.md). That
table is authoritative; this list is only the question each mode answers.

## The handoff is the most important product surface

The strongest parts of the application are usually not the modes themselves but the transitions
between them: Library → Builder, Forge → Library, Builder → Tracker, a saved encounter → Board,
Lore → Board, a map token → the record it references. These turn preparation into usable table
state. The shipped set is tracked as an acceptance checklist in the connected-workflow spec's
**Integration contract** — that list is authoritative, and the examples here are illustrative only.

This yields the product's main tie-breaker:

> **When choosing between making one mode deeper and making two existing modes connect cleanly, the
> connection usually wins — if it meaningfully reduces re-entry or context switching.**

A mode that grows features its neighbours could have reached by reference is usually solving the
wrong problem.

## Principles this rests on

Each of these is stated and owned elsewhere. They are listed here only so the intent above is
readable without chasing every link first.

- **Create once, use everywhere.** Reusable information has one authoritative home and one stable
  id; other surfaces reference it. — `PRODUCT.md` Principle 6, and connected-workflow Principle 1.
- **References resolve live.** A linked card renders from the current record and reports an honest
  missing-record notice when the source is gone, rather than preserving a stale copy. — the
  connected-workflow spec's *"Linked means…"*. This is what makes "create once" trustworthy rather
  than merely tidy.
- **Table speed.** During play the GM's attention belongs to the players, not the interface: fast
  retrieval, glanceable state, few context switches, predictable actions, honest failure states. —
  `PRODUCT.md` Principle 3, and the roadmap's *"prefer bridges over deeper single-mode chrome"*.
- **System fidelity.** CR remains CR, creature level remains creature level, native terminology
  stays native, and information the source never stated stays absent. — `PRODUCT.md` Principle 1 and
  `README.md` §5 and §13.
- **Local-first trust.** No account, server, or subscription; campaign data stays on the device and
  leaves only through files the GM exports. The one network dependency is the Material Symbols font
  Maps uses for token icons, which degrades to unlabelled tokens offline (`PRODUCT.md` constraints).
  — `PRODUCT.md` Principle 4.

Local-first is a promise, not just an implementation choice, so the GM should be able to answer:
where does my campaign data live, **which export format carries which parts of it** (the portable
JSON save, the campaign archive, or a single map or board export), and how do I move or recover my
work? Prefer explicit, understandable ownership over invisible synchronisation. `PRODUCT.md`
persistence and the save-trust spec carry the current answers.

## What it is not trying to become

The boundaries — not a VTT, not a cloud campaign service, not an exhaustive worldbuilding database,
not a rules-automation engine, not a system-conversion tool — are enumerated in the
connected-workflow spec's **Non-goals** and the roadmap's **Program non-goals**.

Read them there rather than here, because several carry deliberate, documented exceptions: a Maps
token may hold a Library `ref` (a bounded reopen, not a step toward a VTT), and a Board note may be
explicitly copied to Lore (a copy the GM initiates, never automatic capture). The exceptions are the
interesting part, and only the owning documents can be trusted to keep them current.

The general shape holds: ideas from those categories may be useful, but they should not pull the
product away from its core workflow. The goal is not to reproduce the depth of a virtual tabletop or
a campaign-management suite — it is to give the GM the **right information and action at the moment
it is needed**.

## Product decision test

Before adding a substantial feature, ask:

> **Does this help the GM move from "I need this" to "I am using it" with less searching, copying,
> re-entry, or context switching?**

Then:

1. Does it strengthen preparation, play, or the handoff between them?
2. Does it reuse existing campaign objects instead of creating another source of truth?
3. Is its ownership clear?
4. Does it remain fast enough to use while running a table?
5. Does it preserve system fidelity?
6. Does it preserve the local-first trust model?
7. Is it simpler than asking the GM to manage another tool?

A feature need not satisfy every question equally. But if it cannot clearly support the core intent,
it should not be added merely because another product has it.

## Success

Bestiary & Grimoire succeeds when preparation feels like it is accumulating **usable game state**,
not just documents and data.

The ideal session is one where the GM can prepare creatures, encounters, adventure text and
locations; stage what matters for the next session; sit down to run the game; move through those
prepared objects without recreating them; and finish with campaign data still understandable, owned
and portable.

The application should feel less like switching among seven tools and more like working inside **one
campaign from several useful perspectives**.

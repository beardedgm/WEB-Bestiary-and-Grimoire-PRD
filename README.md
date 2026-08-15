# TTRPG Creature & Spell Data

A queryable dataset of **9,339 monsters and spells** drawn from Dungeons & Dragons 5th
Edition and Pathfinder 2nd Edition, normalised into two JSON schemas that are shared
across both game systems.

This is meant to be used as a **database** — the information source you build tools on
top of. Encounter builders, spell lookups, random generators, VTT importers, statistical
analysis, whatever. The point of the normalisation work is that you write your query
logic *once* and it works against both games.

This document explains not just *what* the fields are, but *why they are shaped the way
they are*. That reasoning matters, because if you extend this data without understanding
the design rules, you will break the property that makes it useful.

---

## Contents

1. [What's in the box](#1-whats-in-the-box)
2. [Sixty-second orientation](#2-sixty-second-orientation)
3. [The core idea: one schema, two games](#3-the-core-idea-one-schema-two-games)
4. [The three techniques for expressing difference](#4-the-three-techniques-for-expressing-difference)
5. [The rule we never broke: no fabrication](#5-the-rule-we-never-broke-no-fabrication)
6. [Why monsters and spells are separate schemas](#6-why-monsters-and-spells-are-separate-schemas)
7. [Reading a monster record](#7-reading-a-monster-record)
8. [Reading a spell record](#8-reading-a-spell-record)
9. [The shared vocabulary](#9-the-shared-vocabulary)
10. [Degrees of success — the hardest thing here](#10-degrees-of-success--the-hardest-thing-here)
11. [Data quality: what `parse` is telling you](#11-data-quality-what-parse-is-telling-you)
12. [Recipes](#12-recipes)
13. [Traps that will bite you](#13-traps-that-will-bite-you)
14. [Provenance and regeneration](#14-provenance-and-regeneration)
15. [Extending the schemas](#15-extending-the-schemas)

---

## 1. What's in the box

Four bundles, split by **content type** and **game system**:

| File | Records | Size | Contents |
|---|---:|---:|---|
| `monsters-5e.json` | 3,141 | 11.8 MB | D&D 5e creatures, 8 sourcebooks |
| `monsters-pf2e.json` | 2,598 | 9.4 MB | Pathfinder 2e creatures, 79 sourcebooks |
| `spells-5e.json` | 1,542 | 2.7 MB | D&D 5e spells, 4 sourcebooks |
| `spells-pf2e.json` | 2,058 | 3.2 MB | Pathfinder 2e spells, 58 sourcebooks |

Each file is a **bare JSON array**, minified, sorted by `id`. No wrapper object — every
element is a complete record that validates against its schema on its own:

```python
import json
monsters = json.load(open("monsters-5e.json"))   # -> list[dict]
```

Two schema files describe them:

- **`monster.schema.json`** — JSON Schema (draft 2020-12) for creature records
- **`spell.schema.json`** — JSON Schema (draft 2020-12) for spell records

Both are **fully self-contained**: every `$ref` inside them is internal, so you can hand
either file to a project that has never heard of the other and it will validate.

Two converters regenerate everything from the original markdown:

- **`convert_monsters.py`**, **`convert_spells.py`**

Alongside the bundles, every source markdown file also has a **sidecar** `.json` next to
it (one record per file, pretty-printed). Same data, different packaging — use the
bundles for loading, the sidecars for browsing and diffing.

### Coverage at a glance

```
monsters   5,739 records   5,485 clean · 254 flagged
spells     3,600 records   3,277 clean · 323 flagged
           ─────────────
           9,339 records   100% valid against their schemas
```

---

## 2. Sixty-second orientation

```python
import json

spells  = json.load(open("spells-pf2e.json"))
by_id   = {s["id"]: s for s in spells}

s = by_id["pf2e:crb:sound-burst"]

s["name"]                    # 'Sound Burst'
s["level"]                   # {'kind': 'rank', 'value': 2, 'display': 'Spell 2'}
s["activity"]                # {'unit': 'action', 'number': 2, 'symbol': '◆◆'}
s["save"]["defense"]         # 'fortitude'
s["save"]["outcomes"]["criticalFailure"]
# 'The creature takes double damage, is deafened for 1 minute, and is stunned 1.'
s["heightening"]             # [{'kind': 'increment', 'step': 1, ...}]
```

Three things to notice immediately, because they are the whole design in miniature:

1. **`level.kind` is `"rank"`**, not `"level"`. Pathfinder calls it a rank; D&D calls it
   a level. The field is the same field; the `kind` tells you which game's vocabulary the
   value is in. It is never silently converted.
2. **`save.dc` is `null`.** A spell has no DC of its own — the caster supplies it. Absent
   data is represented as absent, not as zero.
3. **`outcomes` has four keys here**, because Pathfinder resolves saves on a four-rung
   ladder. A D&D spell fills two of the same four slots. Same field, different fill.

---

## 3. The core idea: one schema, two games

### The problem

A D&D stat block and a Pathfinder stat block describe the same kind of thing — a creature
you might fight — but they disagree about almost every detail of how to say it.

```
D&D 5e                              Pathfinder 2e
────────────────────────────────    ────────────────────────────────
STR 23 (+6)   ability SCORE + mod   STR +6        modifier only, no score
CR 15                               Creature 12   different scale entirely
Saves: Dex +6, Con +10 (some)       Fort/Ref/Will (always exactly three)
Bite: +11 to hit                    jaws +26/+21/+16  (three attacks per turn)
"Huge Dragon, lawful evil"          "le, huge, amphibious, dragon" (one flat list)
success / failure                   crit success / success / failure / crit failure
```

The naive responses are both wrong:

- **Two totally separate schemas** means you write and maintain every piece of logic
  twice, and nothing can ever be compared or searched across both games.
- **One schema that flattens the differences away** means lying about the data. This is
  the trap most datasets fall into, and it is worth being specific about how it fails
  (see §5).

### The rule

> **System differences are expressed as VALUES, never as different KEYS.**

Every monster record has the *same 20 top-level keys*. Every spell record has the *same
22 top-level keys*. A Pathfinder dragon and a D&D dragon are structurally identical
documents; they differ in what those fields *contain*.

This is enforced, not merely encouraged — both schemas set `"additionalProperties": false`
at the top level, so a record that sprouts a system-specific key fails validation.

### Why this pays off

Because the shape is stable, generic code just works:

```python
# runs unmodified across all four files
def is_dangerous(rec):
    return any(e.get("save") for e in rec["entries"])
```

And because the *values* are honest, system-specific code is still possible and still
correct — you branch on `gameSystem` or on a `kind` discriminator, not on whether a key
happens to exist.

---

## 4. The three techniques for expressing difference

There are exactly three moves used throughout. Learn these and the schemas become
predictable.

### Technique 1 — Nullable fields for "this system doesn't have that"

```jsonc
// Pathfinder creature — the game has no ability scores at all
"abilityMods":   { "str": 6, "dex": 3, ... },
"abilityScores": null

// D&D creature — has both
"abilityMods":   { "str": 6, "dex": 1, ... },
"abilityScores": { "str": 23, "dex": 12, ... }
```

`null` means **"this concept does not exist for this record."** It is not a default, not
a zero, not an error. Read it as information.

A detail that shows why this matters: **360 of the 3,141 D&D creatures also have
`abilityScores: null`** — the Black Flag books print modifiers only, exactly like
Pathfinder. So the rule isn't "5e has scores, PF2e doesn't." It's "this record has
scores, or it doesn't." Always test the field, never the system.

### Technique 2 — Discriminated unions for "same slot, different meaning"

When both systems have a concept but measure it differently, a sibling `kind` field says
which measurement you're looking at:

```jsonc
"challenge": { "kind": "cr",    "value": 15, "xp": 13000, "display": "15" }
"challenge": { "kind": "level", "value": 12, "xp": null,  "display": "Creature 12" }
```

**A CR 15 monster and a level 12 creature are not comparable numbers.** Putting them in
the same field without the discriminator would be a silent lie. With it, a consumer that
wants to sort by difficulty knows it must branch — or refuse.

The same pattern appears in several places:

| Field | Discriminator values |
|---|---|
| `challenge.kind` (monster) | `cr` · `level` |
| `level.kind` (spell) | `level` · `rank` · `focus` |
| `recharge.kind` (monster entry) | `dice` (wait N rounds) · `d6-range` (roll each turn) |
| `heightening[].kind` (spell) | `increment` · `fixed` · `slot` |

When you see a `kind` field, that is the schema telling you: *do not assume these are the
same thing.*

### Technique 3 — Native vocabularies plus one escape hatch

Some fields hold a system's own words, and that's correct:

```jsonc
// Pathfinder always has exactly three saves
"savingThrows": [ {"name":"fort","mod":20}, {"name":"ref","mod":22}, {"name":"will","mod":23} ]

// D&D has up to six, and only for proficient abilities
"savingThrows": [ {"name":"dex","mod":6}, {"name":"con","mod":10}, {"name":"wis","mod":7} ]
```

Same field, same `{name, mod}` shape, different vocabulary inside. Forcing these into one
vocabulary would require inventing a mapping that doesn't exist in either game.

For anything genuinely unique to one system, there is **exactly one place it may live**:

```jsonc
"systemExtras": {
  "recallKnowledge": [ { "category": "Dragon", "skill": "Arcana", "dc": 30 } ],  // PF2e only
  "legendaryActionsPerRound": 3                                                  // 5e only
}
```

`systemExtras` is an open object. Everything above it is closed. This is deliberate: it
gives one-system concepts a home without letting them leak into the shared surface, so
"is this field universal?" always has a clear answer — *is it inside `systemExtras` or
not?*

---

## 5. The rule we never broke: no fabrication

This is the most important section in this document.

While designing this, we looked at an existing dataset that had converted Pathfinder
creatures into a D&D-shaped format. It contained this:

```jsonc
"abilities": { "str": 26, "dex": 18, "con": 22, "int": 18, "wis": 22, "cha": 20 }
```

Those numbers are **not in Pathfinder**. Pathfinder creatures have modifiers (+8, +4,
+6...), and someone had run D&D's formula backwards to manufacture plausible-looking
scores, because the display they were feeding had six boxes to fill.

The data was not merely lossy. It was **confidently wrong**, and nothing downstream could
tell. A lossy field you can detect — it's empty. An invented field looks like data.

So the governing principle here is:

> **Absent information is represented as absent. We never compute a value the source
> didn't state.**

Concretely, that means:

- `abilityScores: null` rather than back-computed scores
- `save.dc: null` on every spell, because spells genuinely don't have one
- `activity.number: null` on the 55 spells whose source says `"minute"` without a number
- `damage[].average: null` for Pathfinder, which doesn't print averages
- `identity.size: null` on the 65 creatures whose source omits it

The schemas actively defend this. `abilityMods` is range-checked to `-10..20`, which is
wide enough for the real maximum in this corpus (+17, on Black Flag's highest-tier
creatures) but narrow enough that ability *scores* misfiled into it — which land in the
21–30 range — fail validation loudly:

```
abilityMods.str: 26 is greater than the maximum of 20   ← validation error, not silent corruption
```

**If you extend this data, keep this rule.** It is what makes the dataset trustworthy as
a source of truth rather than a plausible-looking approximation.

---

## 6. Why monsters and spells are separate schemas

We use one schema across two *game systems*, but two schemas across two *content types*.
That is not inconsistent — it's the same test applied at two levels:

> **Do these describe the same kind of thing?**

A D&D dragon and a Pathfinder dragon are both *creatures*. One schema, values differ.
A dragon and *Fireball* are not the same kind of thing. Two schemas.

The numbers make it concrete. Exactly **half** of the monster record is meaningless for a
spell:

```
dead on a spell:    challenge, abilityMods, abilityScores, perception, senses,
                    languages, skills, defenses, speeds, spellcasting
dead on a monster:  level, school, traditions, classes, components, materials,
                    range, targets, duration, heightening
```

A merged schema would be 30 fields, a third of them structurally null on any given
record, and `additionalProperties: false` would have to widen to the union — so it could
no longer catch a monster that wrongly grew a `components` field. You'd trade a schema
that *validates* for one that merely *describes*.

The two files deliberately restate the eight shapes they share (`activity`, `save`,
`area`, `damage`, `traits`, `entries`, `source`, `parse`) rather than importing them from
a common file. That duplication is the price of each schema being independently portable
— you can hand `spell.schema.json` and `spells-pf2e.json` to a project and it needs
nothing else.

---

## 7. Reading a monster record

Every monster has these 20 keys. Nothing more, nothing less.

```jsonc
{
  "schema": "ttrpg-monster/0.2",
  "id": "pf2e:b1:adult-green-dragon",     // system:book:slug — stable, unique
  "name": "Adult Green Dragon",
  "gameSystem": "pf2e",                   // "dnd5e" | "pf2e"
  "variant": "b1",                        // which book/ruleset within the system
  "source": { "code": "b1", "name": "Bestiary", "page": null,
              "path": "monsters/pf2e/b1/adult-green-dragon.md" },

  "challenge": { "kind": "level", "value": 12, "xp": null, "display": "Creature 12" },

  "identity": {
    "size": "Huge",                       // Tiny…Gargantuan, plus Titanic (A5E only), or null
    "types": ["dragon"],
    "subtypes": ["amphibious"],
    "rarity": "common",                   // PF2e only
    "alignment": { "raw": "le", "lawChaos": "lawful", "goodEvil": "evil" },
    "nativeTraits": ["le","huge","amphibious","dragon"]   // PF2e trait line, verbatim
  },

  "abilityMods":   { "str": 6, "dex": 3, "con": 3, "int": 4, "wis": 4, "cha": 5 },
  "abilityScores": null,                  // see §4, technique 1

  "perception": { "mod": 22, "passive": null },   // 5e fills passive; PF2e fills mod
  "senses":    [ { "name": "scent", "range": 60, "unit": "ft", "acuity": "imprecise" } ],
  "languages": [ "Common", "Draconic", "Elven", "Sylvan" ],
  "skills":    [ { "name": "Athletics", "mod": 24 } ],

  "defenses": {
    "ac": { "value": 34, "note": null },
    "hp": [ { "value": 215, "formula": null, "note": null } ],   // array: some creatures have phases
    "savingThrows": [ { "name": "fort", "mod": 20 } ],
    "saveNote": "+1 status to all saves vs. magic",
    "immunities": { "damage": [...], "conditions": [...], "other": [...] },
    "resistances": [ { "name": "physical", "amount": 10, "note": "except adamantine" } ],
    "weaknesses":  [ { "name": "cold iron", "amount": 10, "note": null } ],
    "hardness": null
  },

  "speeds": { "unit": "ft", "modes": { "walk": 40, "fly": 160, "swim": 40 },
              "special": ["trackless step", "woodland stride"] },

  "entries": [ ... ],        // the important one — see below
  "spellcasting": [ ... ],
  "systemExtras": { ... },
  "parse": { "status": "ok", "warnings": [], "unmapped": [] }
}
```

### `entries` — the ordered spine

This is where nearly all the interesting content lives. **One flat, ordered array holds
everything**: passive traits, actions, attacks, reactions, legendary actions. It is in
*source order*, so you can render a faithful stat block by walking it.

```jsonc
{
  "name": "jaws",
  "category": "strike",                   // what KIND of thing this is
  "placement": "bot",                     // WHERE the source printed it
  "activity": { "unit": "action", "number": 1, "symbol": "◆" },
  "attack": {
    "range": "melee",
    "bonus": 26,
    "map": [26, 21, 16],                  // full multiple-attack progression
    "traits": ["magical", "poison"],
    "reach": { "value": 15, "unit": "ft" }
  },
  "damage": [
    { "formula": "3d10+12", "average": null, "type": "piercing" },
    { "formula": "3d4",     "average": null, "type": "poison"   }
  ],
  "entries": ["…prose…"]
}
```

Two fields here deserve explanation because they look redundant and aren't:

**`category` vs `placement`.** `category` is *semantics* — what the thing is in the action
economy (`passive`, `action`, `reaction`, `free`, `strike`, `legendary`, `lair`,
`mythic`). `placement` is *layout* — which section of the printed stat block it came from.

In D&D these coincide, which is why most datasets conflate them. In Pathfinder they don't:
Attack of Opportunity is a **reaction** that prints in the **mid** block; Breath Weapon is
a two-action **activity** that prints in the **bot** block. Keeping them separate means you
can group by either one.

```
5e placements:    traits · actions · bonusActions · reactions · legendary
PF2e placements:  mid · bot
```

**`map`.** Pathfinder creatures attack up to three times per turn at a decreasing bonus.
`map` holds the whole progression; `bonus` is a convenience copy of the first value. D&D
gets a one-element array so the field is always the same type. This is load-bearing data —
`[26, 21, 16]` steps by 5, while an *agile* weapon steps by 4 (`[26, 22, 18]`), which
independently confirms the trait sitting next to it.

---

## 8. Reading a spell record

22 keys this time, same discipline.

```jsonc
{
  "schema": "ttrpg-spell/0.1",
  "id": "pf2e:crb:sound-burst",
  "name": "Sound Burst",
  "gameSystem": "pf2e",
  "variant": "crb",
  "source": { "code": "crb", "name": "CRB p.370", "page": 370, "path": "..." },

  "level": { "kind": "rank", "value": 2, "display": "Spell 2" },

  "identity": {
    "rarity": "common",
    "traits": ["evocation","sonic"],     // PF2e trait line
    "school": null,                       // 5e only, title-cased
    "traditions": ["divine","occult"],    // PF2e only
    "classes": [],                        // 5e only
    "cantrip": false,
    "ritual": false
  },

  "activity":   { "unit": "action", "number": 2, "symbol": "◆◆" },
  "trigger":    null,                     // reaction spells only
  "components": { "list": ["somatic","verbal"], "material": null,
                  "cost": null, "currency": null, "consumed": null },

  "range":    { "text": "30 feet", "value": 30, "unit": "ft" },
  "targets":  null,
  "area":     { "shape": "burst", "size": 10, "unit": "ft", "text": "10-foot burst" },
  "duration": { "text": null, "value": null, "unit": null,
                "concentration": false, "sustained": false },

  "save":   { "defense": "fortitude", "dc": null, "basic": false, "outcomes": { ... } },
  "attack": null,                         // set INSTEAD of save for spell attack rolls
  "damage": [ { "formula": "2d10", "average": null, "type": "sonic" } ],

  "heightening": [ { "kind": "increment", "step": 1, "atRank": null,
                     "text": "The damage increases by 1d10." } ],

  "entries": [ "…prose…" ],
  "systemExtras": { },
  "parse": { "status": "ok", "warnings": [], "unmapped": [] }
}
```

### Things worth knowing about spells

**`level.kind` has three values, not two.** 617 Pathfinder spells are **focus spells** —
they cost focus points, not spell slots. That is a genuinely different resource, so it
gets its own discriminator rather than being filed as a rank.

```
level     1,542    D&D spell levels
rank      1,441    Pathfinder ranks
focus       617    Pathfinder focus spells
```

**Cantrips are a flag, not a level.** D&D writes `Cantrip` where a number would go;
Pathfinder marks it as a trait and can combine it with a Focus level. Both set
`identity.cantrip: true`. **Don't test `level.value == 0`** — test the flag.

**`components.list` is one shared vocabulary.** D&D's `V, S, M` and Pathfinder's
`(somatic, verbal)` both normalise to `verbal` / `somatic` / `material` / `focus`. This is
one of the few places the two games genuinely agreed and a merge was honest.

**`attack` and `save` are alternatives.** 117 spells resolve with an attack roll instead
of a save — including 23 Pathfinder spells whose source lists `AC` in the *Saving Throw*
field. Those get `attack` populated and `save: null`. Check both.

**`heightening` unifies two different scaling systems:**

```
kind: "increment"   692   PF2e "Heightened (+2)"  — every N ranks, `step` = N
kind: "fixed"       844   PF2e "Heightened (5th)" — at one rank, `atRank` = 5
kind: "slot"        582   5e "Using a Higher-Level Spell Slot" — prose only
```

`slot` entries have `step: null` and `atRank: null` — not because we failed, but because
D&D states the scaling in a sentence and there is nothing structured to extract. The text
is always there.

---

## 9. The shared vocabulary

Eight shapes recur in both schemas with identical structure. Learn them once.

### `activity` — action economy

```jsonc
{ "unit": "action", "number": 2, "symbol": "◆◆" }    // PF2e two-action
{ "unit": "legendary", "number": 2, "symbol": null } // 5e Wing Attack (Costs 2)
{ "unit": "reaction", "number": 1, "symbol": "◈" }
{ "unit": "minute", "number": 10, "symbol": null }   // long casting time
```

`{unit, number}` covers every action economy in both games without a growing enum of
compound names. `symbol` carries Pathfinder's glyph when the source used one.

Spells add `numberMax` for the 49 Pathfinder spells that read `Cast: 1 to 3` — the caster
chooses how many actions to spend and the effect scales.

### `save` — and its four-rung `outcomes` map

See §10. This is the one worth reading closely.

### `damage`

```jsonc
[ { "formula": "3d10+12", "average": null, "type": "piercing" },
  { "formula": "3d4",     "average": null, "type": "poison"   } ]
```

Always an array — many attacks deal two or more damage types. `average` is populated for
D&D (which prints it) and `null` for Pathfinder (which doesn't). Compute it yourself if
you need it; the schema won't pretend.

### `area`

```jsonc
{ "shape": "cone", "size": 50, "unit": "ft", "text": "50-foot cone" }
```

Shape and size are extracted where the source is regular; `text` always preserves the
original phrasing.

### `entries` (the string array)

Prose paragraphs, one per element, in source order. **This is always present and always
faithful.** Every structured field elsewhere is an *addition* alongside the text, never a
replacement for it. If our parsing of some field was wrong, the truth is still in
`entries`.

### `source` and `parse`

`source.path` is the relative path of the markdown file the record came from, so you can
always get back to the original. `parse` is covered in §11.

---

## 10. Degrees of success — the hardest thing here

This deserves its own section because it is the single place where D&D and Pathfinder
differ most deeply, and where a careless schema does the most damage.

**D&D resolves a save two ways:** you succeed or you fail.

**Pathfinder resolves it four ways:** critical success, success, failure, critical
failure. Beating the DC by 10 or missing it by 10 shifts the result one rung.

An early draft of this schema had `onSuccess` / `onFailure`. That is D&D's model wearing a
neutral coat — it structurally cannot express half of Pathfinder's results. The fix was to
make `outcomes` a **map keyed by degree**, which each system fills as far as it goes:

```jsonc
// D&D — two rungs
"save": { "defense": "con", "dc": 18, "basic": false,
          "outcomes": { "success": "half", "failure": "full" } }

// Pathfinder BASIC save — canonical shorthand, four rungs
"save": { "defense": "fortitude", "dc": 31, "basic": true,
          "outcomes": { "criticalSuccess": "none", "success": "half",
                        "failure": "full", "criticalFailure": "double" } }

// Pathfinder spell that PRINTS its ladder — the source's own words
"save": { "defense": "fortitude", "dc": null, "basic": false,
          "outcomes": {
            "criticalSuccess": "The creature is unaffected.",
            "success":         "The creature takes half damage.",
            "failure":         "The creature takes full damage and is deafened for 1 round.",
            "criticalFailure": "The creature takes double damage, is deafened for 1 minute, and is stunned 1."
          } }
```

### The `basic` flag tells you how to read the values

This is the part to internalise:

- **`basic: true`** → the values are the canonical damage scaling: `none` / `half` /
  `full` / `double`. A "basic save" is Pathfinder shorthand meaning exactly that ladder.
  You can act on these programmatically.
- **`basic: false`** → the values are **effect text in the source's own words**. Render
  them; don't try to compute with them.

Same field, two kinds of content, one boolean telling you which. Always branch on `basic`.

### How much of this exists

```
monsters   680 basic (canonical)  ·  308 printed ladders  ·  2,425 D&D two-rung
           243 monster abilities carry all four rungs in the source's own words

spells     160 basic  ·  456 with all four rungs  ·  1,193 with any save at all
```

### One more subtlety

53 monster abilities and every spell print a degree ladder **without a DC on that line** —
the DC is stated elsewhere in the paragraph, or supplied by the caster. Rather than
inventing a number or dropping the ladder, `defense` and `dc` are nullable and the
outcomes are preserved. So:

```python
if entry.get("save"):
    ladder = entry["save"]["outcomes"]        # may be populated
    dc     = entry["save"]["dc"]              # may legitimately be None
```

---

## 11. Data quality: what `parse` is telling you

Every record carries a self-report:

```jsonc
"parse": {
  "status": "ok",          // "ok" | "partial" | "failed"
  "warnings": [],
  "unmapped": []
}
```

| status | meaning | count |
|---|---|---|
| `ok` | everything the source stated was extracted | 8,762 |
| `partial` | something was missing or malformed **in the source** | 577 |
| `failed` | the parser threw | **0** |

**This is the honesty layer.** The alternative — silently emitting a well-formed record
with empty fields — is how bad data spreads, because nothing downstream can distinguish
"this creature has no actions" from "we couldn't read its actions."

The flagged records are almost entirely **upstream source problems**, not conversion bugs:

```
170 + 109   degree-of-success labels present but EMPTY in the source
     95     no AC (Pathfinder placeholder stubs — ~150-byte files with "AC —", "HP —")
     88     no abilities or actions in the file
     82     `Classes` field blank in the 2024 SRD spells
     65     no size trait in the source
     55     casting time missing its number ("minute" instead of "1 minute")
     49     compact spell lists where the source lost its commas
      4     spells with metadata but no description text
      1     a spell whose school reads "Transformation" — not a real D&D school
```

### How to use this

```python
# strict: only fully clean records
clean = [r for r in records if r["parse"]["status"] == "ok"]

# pragmatic: use everything, but know what you're holding
for r in records:
    if r["parse"]["warnings"]:
        log.debug("%s: %s", r["id"], "; ".join(r["parse"]["warnings"]))
```

For most purposes **use everything** — a `partial` record is usually complete except for
one field, and the warning names which. Filter to `ok` only when a missing field would
silently corrupt your result (e.g. computing average AC by CR).

---

## 12. Recipes

```python
import json, collections
mons  = json.load(open("monsters-pf2e.json")) + json.load(open("monsters-5e.json"))
spell = json.load(open("spells-pf2e.json"))   + json.load(open("spells-5e.json"))
```

**Look up by id** — ids are stable and unique within a file:

```python
index = {r["id"]: r for r in mons}
index["dnd5e:srd51:adult-green-dragon"]
```

**Find every creature with a poison breath weapon** (works across both games):

```python
[m["name"] for m in mons
 if any("breath" in e["name"].lower()
        and any(d["type"] == "poison" for d in e.get("damage", []))
        for e in m["entries"])]
```

**Every spell that can critically fail into a condition:**

```python
[s["name"] for s in spell
 if s["save"] and "stunned" in (s["save"]["outcomes"].get("criticalFailure") or "")]
```

**Difficulty bands — note the required branch:**

```python
by_band = collections.defaultdict(list)
for m in mons:
    c = m["challenge"]
    if c["value"] is None: continue
    key = f'{c["kind"]}:{c["value"]}'     # 'cr:15' and 'level:15' stay distinct
    by_band[key].append(m["name"])
```

**Creatures that hit three times a turn (Pathfinder MAP):**

```python
[m["name"] for m in mons
 if any(len((e.get("attack") or {}).get("map", [])) == 3 for e in m["entries"])]
```

**Spells by tradition, then rank:**

```python
idx = collections.defaultdict(list)
for s in spell:
    for t in s["identity"]["traditions"]:
        idx[(t, s["level"]["value"])].append(s["name"])
```

**Load into SQLite for real querying:**

```python
import sqlite3
db = sqlite3.connect("ttrpg.db")
db.execute("CREATE TABLE monster (id TEXT PRIMARY KEY, name TEXT, system TEXT, "
           "variant TEXT, kind TEXT, value REAL, doc TEXT)")
db.executemany("INSERT INTO monster VALUES (?,?,?,?,?,?,?)",
    [(m["id"], m["name"], m["gameSystem"], m["variant"],
      m["challenge"]["kind"], m["challenge"]["value"], json.dumps(m)) for m in mons])
db.commit()
```

Keep the whole record in a `doc` column and index the columns you filter on. At this
scale (9,339 rows) that is more than fast enough, and you never lose fidelity.

**Validate before trusting a modification:**

```python
from jsonschema import Draft202012Validator
v = Draft202012Validator(json.load(open("monster.schema.json")))
errors = [e.message for e in v.iter_errors(my_edited_record)]
```

---

## 13. Traps that will bite you

**Names are not unique.** Within a single game system, **793 spell names and 387 monster
names repeat across books** — *Fireball* exists in four D&D sources, and there are five
different Adult Green Dragons. That's 1,103 redundant spell records and 921 redundant
monster records. **Always key on `id`**, and show `variant` in any UI, or your users will
see a column of identical rows with no way to tell them apart.

**`challenge.value` is not comparable across systems.** CR 15 ≠ Creature 15. Branch on
`kind`, or restrict to one system, or accept that any cross-system ranking is your
approximation and label it as such.

**Don't test `level.value == 0` for cantrips.** Use `identity.cantrip`. Pathfinder
cantrips carry a real rank.

**Don't assume D&D means ability scores.** 360 Black Flag creatures have
`abilityScores: null`. Test the field.

**Check `attack` when `save` is null** on spells, and vice versa. 117 spells use an attack
roll.

**`hp` is an array.** Almost always length 1, but not guaranteed — some creatures print
multiple pools.

**`entries[].entries` is a nested name.** A monster's `entries` array holds ability
objects; each ability has its own `entries` array of prose strings. It reads oddly but
it's consistent.

**`damage[].average` is null for all Pathfinder records.** If you're charting damage,
either compute averages yourself or you'll silently plot only half the dataset.

### Known imperfections

Honest disclosure, so you don't waste time thinking you found a bug:

- Some D&D `attack.targets` values carry a leading comma (`", one target"`) — cosmetic
  artifact of the phrase split.
- Pathfinder prose retains occasional `|` characters from stripped wiki-links
  (`persistent damage|persistent acid damage`). We deliberately strip only the source-code
  token, because guessing the display text truncated real sentences.
- Three Pathfinder spells have `Cast: "2 to 2 rounds"` — the source itself is malformed.
- One D&D spell lists school `Transformation`, which doesn't exist. Flagged, not
  corrected.

---

## 14. Provenance and regeneration

The JSON is **derived data**. The markdown files under `monsters/` and `spells/` are the
source of truth, and every record points back to its origin:

```jsonc
"source": { "path": "monsters/pf2e/b1/adult-green-dragon.md" }
```

Nothing in the pipeline ever modifies or deletes markdown.

```
monsters/**/*.md  ──convert_monsters.py──▶  sidecar .json  ──┐
spells/**/*.md    ──convert_spells.py────▶  sidecar .json  ──┤
                                                             ├─build_bundles.py─▶  monsters-{5e,pf2e}.json
                                                             │                     spells-{5e,pf2e}.json
                                                             └────────────────────▶  browser-standalone.html
```

To regenerate:

```bash
python convert_monsters.py      # rewrites every monster sidecar in place
python convert_spells.py        # rewrites every spell sidecar in place
python build_bundles.py         # sidecars -> the four bundles + the standalone browser
```

`build_bundles.py` collects the sidecars per system, sorts by `id`, minifies, and rebuilds
`browser-standalone.html` by inlining the four bundles into `browser.html` as gzipped
base64. It refuses to build on a duplicate `id` or a record whose `gameSystem` doesn't
match its directory, and it only writes files whose contents actually changed.

To find out whether the committed artifacts are current without touching anything:

```bash
python build_bundles.py --check
```

That exits non-zero and names the stale files. It's the check to run before committing.

**The bundles are build artifacts.** If you edit a sidecar without rebuilding, the bundle
goes stale silently. Pick one as your working copy and regenerate the other.

Records are sorted by `id`, so regenerating produces a byte-identical file when the input
hasn't changed — which keeps `git diff` meaningful. The standalone is byte-reproducible
too: its gzip payloads are written with `mtime=0` for exactly that reason.

Directories under `monsters/<system>/` and `spells/<system>/` whose name begins with `_`
are scratch space. Both the converters and the bundle build skip them.

### Content licensing

This data is converted from open-licensed material (SRD 5.1, SRD 5.2, Pathfinder's OGL/ORC
content, and third-party open books including Tome of Beasts, Creature Codex, Deep Magic,
Level Up Advanced 5e, and Black Flag). Non-open content is absent — there is no beholder
or mind flayer here, and that's why. **Check the licence terms of each source book before
redistributing.** `variant` and `source` on every record tell you exactly which book a
given entry came from.

---

## 15. Extending the schemas

If you add fields, follow the same rules or the dataset loses the property that makes it
worth having.

1. **Differences become values, not keys.** If D&D and Pathfinder both have a concept,
   one field holds it with a `kind` discriminator or a native vocabulary. Never
   `dnd5eFoo` and `pf2eFoo`.
2. **One-system concepts go in `systemExtras`.** That's what it's for. Everything outside
   it stays universal.
3. **Never fabricate.** If the source didn't say it, the value is `null` and — if its
   absence is notable — a warning goes in `parse.warnings`.
4. **Keep `entries` faithful.** Structured fields ride alongside the text; they never
   replace it.
5. **Bump the version.** `schema` is `ttrpg-monster/0.2` and `ttrpg-spell/0.1`. Additive
   changes bump the minor; anything that breaks existing consumers bumps the major. The
   `schema` field is on every record specifically so a consumer can check.
6. **Validate the whole corpus after any change**, not a sample. Both schemas set
   `additionalProperties: false`, so a typo in a key name fails loudly — which is the
   point.

```python
from jsonschema import Draft202012Validator
v = Draft202012Validator(json.load(open("monster.schema.json")))
bad = [(r["id"], e.message) for r in records for e in v.iter_errors(r)]
assert not bad, bad[:5]
```

---

## Quick reference

```
ID FORMAT        <system>:<book>:<slug>          e.g. pf2e:b1:adult-green-dragon
SYSTEMS          dnd5e · pf2e
MONSTER KEYS     20, identical across both systems
SPELL KEYS       22, identical across both systems
DISCRIMINATORS   challenge.kind · level.kind · recharge.kind · heightening[].kind
NULL MEANS       "the source did not state this" — never a default
systemExtras     the only place system-specific keys are permitted
parse.status     ok · partial · failed        (0 failed in the current build)
entries          always faithful prose; structured fields are additive
save.basic       true = canonical none/half/full/double · false = source's own text
```

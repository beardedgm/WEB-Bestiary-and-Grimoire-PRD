#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Convert D&D 5e and Pathfinder 2e monster markdown into ttrpg-monster/0.2 JSON.

Writes a sidecar .json next to each .md. Never deletes or modifies markdown.
Naming: <kebab-stem>-<variant>-<system>.json
"""
import os, re, json, sys, collections

SCHEMA_VER = "ttrpg-monster/0.2"

VAR5E = {
    '5.1_srd_(2015_mm)': 'srd51',
    '5.2_srd_(2025_mm)': 'srd52',
    'a5e_monstrous_menagerie': 'a5e',
    'black_flag': 'blackflag',
    'creature_codex': 'creaturecodex',
    'tome_of_beasts_2': 'tob2',
    'tome_of_beasts_2023': 'tob2023',
    'tome_of_beasts_3': 'tob3',
}
SFX = {
    '5.2_srd_(2025_mm)': '_mm_2024',
    'a5e_monstrous_menagerie': '-a5e',
    'black_flag': '_bf',
    'tome_of_beasts_2023': '-tob1-2023',
}

SIZES = {s.lower(): s for s in ["Tiny","Small","Medium","Large","Huge","Gargantuan","Titanic"]}

PF_ALIGN = {
    'lg':('lawful','good'), 'ng':('neutral','good'), 'cg':('chaotic','good'),
    'ln':('lawful','neutral'), 'n':('neutral','neutral'), 'cn':('chaotic','neutral'),
    'le':('lawful','evil'), 'ne':('neutral','evil'), 'ce':('chaotic','evil'),
    'any':(None,None),
}
RARITIES = {'common','uncommon','rare','unique'}

PF_TYPES = {
    'aberration','animal','astral','beast','celestial','construct','dragon','dream',
    'elemental','ethereal','fey','fiend','fungus','giant','humanoid','monitor','ooze',
    'plant','spirit','undead','time','shade','petitioner','soul','aeon','angel','archon',
    'azata','demon','devil','daemon','div','protean','psychopomp','velstrac','genie',
    'oni','rakshasa','troop','swarm','vampire','skeleton','zombie','ghost','mummy',
    'werecreature','dinosaur','arthropod',
}

ABBR = {'strength':'str','dexterity':'dex','constitution':'con',
        'intelligence':'int','wisdom':'wis','charisma':'cha'}

CONDITIONS_PF = {
    'blinded','broken','clumsy','concealed','confused','controlled','dazzled','deafened',
    'doomed','drained','dying','encumbered','enfeebled','fascinated','fatigued','flat-footed',
    'fleeing','frightened','grabbed','hidden','immobilized','invisible','observed','paralyzed',
    'petrified','prone','quickened','restrained','sickened','slowed','stunned','stupefied',
    'unconscious','undetected','unnoticed','wounded','swallowed','persistent damage',
}
CONDITIONS_5E = {
    'blinded','charmed','deafened','exhaustion','frightened','grappled','incapacitated',
    'invisible','paralyzed','petrified','poisoned','prone','restrained','stunned','unconscious',
    'exhausted','deafened','charmed',
}
DAMAGE_TYPES = {
    'acid','bludgeoning','cold','electricity','lightning','fire','force','mental','psychic',
    'negative','void','piercing','poison','positive','vitality','slashing','sonic','thunder',
    'bleed','precision','chaotic','evil','good','lawful','orichalcum','silver','cold iron',
    'adamantine','darkwood','mithral','spirit','untyped','radiant','necrotic','physical',
    'nonlethal','magical','all',
}

ACTION_SYMBOLS = {'◆':1, '⮚':1, '◇':0, '◈':'reaction', '⮜':'reaction'}
ONE, TWO, THREE = '◆', '◆◆', '◆◆◆'
REACT, FREE = '◈', '◇'


def kebab(s):
    s = re.sub(r"[_\s]+", "-", s.strip().lower())
    s = re.sub(r"[^a-z0-9\-]", "", s)
    s = re.sub(r"-{2,}", "-", s)
    return s.strip('-')


def num(s, default=None):
    if s is None: return default
    m = re.search(r'[+-]?\d+(?:\.\d+)?', str(s).replace(',', ''))
    if not m: return default
    v = float(m.group(0))
    return int(v) if v == int(v) else v


KNOWN_MODES = {'walk','fly','swim','climb','burrow','land','hover'}


def value_and_note(body):
    """'34 (21 when prone)' / '190; negative healing, rejuvenation' -> (34, note)"""
    m = re.match(r'\s*([+-]?\d+)\s*(.*)$', body or '')
    if not m:
        return num(body), None
    val = int(m.group(1))
    rest = (m.group(2) or '').strip().lstrip(';,').strip()
    if rest.startswith('(') and rest.endswith(')'):
        rest = rest[1:-1].strip()
    return val, (rest or None)


def blank_record():
    return {
        "schema": SCHEMA_VER, "id": None, "name": None, "gameSystem": None, "variant": None,
        "source": {"code": None, "name": None, "page": None, "path": None},
        "challenge": {"kind": None, "value": None, "xp": None, "display": None},
        "identity": {"size": None, "types": [], "subtypes": [], "rarity": None,
                     "alignment": {"raw": None, "lawChaos": None, "goodEvil": None},
                     "nativeTraits": []},
        "abilityMods": None, "abilityScores": None,
        "perception": {"mod": None, "passive": None},
        "senses": [], "languages": [], "skills": [],
        "defenses": {"ac": {"value": None, "note": None}, "hp": [],
                     "savingThrows": [], "saveNote": None,
                     "immunities": {"damage": [], "conditions": [], "other": []},
                     "resistances": [], "weaknesses": [], "hardness": None},
        "speeds": {"unit": "ft", "modes": {}, "special": []},
        "entries": [], "spellcasting": [], "systemExtras": {},
        "parse": {"status": "ok", "warnings": [], "unmapped": []},
    }


def classify(tokens, conditions):
    dmg, cond, other = [], [], []
    for t in tokens:
        t = t.strip().strip('.')
        if not t: continue
        low = t.lower()
        base = re.sub(r'\s*\(.*?\)\s*', '', low).strip()
        if base in conditions or low in conditions: cond.append(t)
        elif base in DAMAGE_TYPES or low in DAMAGE_TYPES: dmg.append(t)
        else: other.append(t)
    return {"damage": dmg, "conditions": cond, "other": other}


def parse_amounts(s):
    """'cold iron 10, good 10' / 'all 10 (except force)' -> [{name, amount, note}]"""
    out = []
    for tok in re.split(r',(?![^()]*\))', s):
        tok = tok.strip()
        if not tok: continue
        note = None
        mn = re.search(r'\(([^)]*)\)', tok)
        if mn:
            note = mn.group(1).strip()
            tok = re.sub(r'\s*\([^)]*\)', '', tok).strip()
        ma = re.search(r'(\d+)\s*$', tok)
        amount = int(ma.group(1)) if ma else None
        name = re.sub(r'\s*\d+\s*$', '', tok).strip()
        if name:
            out.append({"name": name, "amount": amount, "note": note})
    return out


def parse_senses_list(s):
    out = []
    for tok in re.split(r',(?![^()]*\))', s):
        tok = tok.strip()
        if not tok: continue
        acuity = None
        ma = re.search(r'\((precise|imprecise|vague)\)', tok, re.I)
        if ma:
            acuity = ma.group(1).lower()
            tok = tok.replace(ma.group(0), ' ')
        rng, unit = None, None
        mr = re.search(r'(\d+)\s*(feet|foot|ft\.?|miles?|mi\.?|\')', tok, re.I)
        if mr:
            rng = int(mr.group(1))
            u = mr.group(2).lower()
            unit = 'mi' if u.startswith('mi') else 'ft'
            tok = tok.replace(mr.group(0), ' ')
        name = re.sub(r'\s{2,}', ' ', tok).strip(' ,.;')
        if name:
            out.append({"name": name, "range": rng, "unit": unit, "acuity": acuity})
    return out


def parse_speed_generic(s):
    modes, special = {}, []
    s = s.strip()
    for tok in re.split(r',(?![^()]*\))', s):
        tok = tok.strip()
        if not tok: continue
        m = re.match(r'^([A-Za-z][A-Za-z ]*?)?\s*(\d+)\s*(?:feet|foot|ft\.?|\')', tok, re.I)
        if m:
            mode = (m.group(1) or 'walk').strip().lower() or 'walk'
            mode = {'speed':'walk','land':'walk'}.get(mode, mode)
            if mode in KNOWN_MODES:
                modes[mode] = int(m.group(2))
            else:
                special.append(tok)
        elif re.search(r'\d', tok):
            special.append(tok)
        else:
            special.append(tok)
    return modes, special


def dmg_components(s):
    """PF2e: '3d10+12 piercing plus 3d4 poison' -> components + leftover riders"""
    out, riders = [], []
    for part in re.split(r'\s+plus\s+|\s+and\s+', s):
        part = part.strip().strip('.')
        if not part: continue
        m = re.match(r'^(\d*d?\d+(?:\s*[+-]\s*\d+)?)\s+(.*)$', part)
        if m and re.search(r'\d', m.group(1)):
            formula = re.sub(r'\s+', '', m.group(1))
            dtype = m.group(2).strip()
            out.append({"formula": formula, "average": None, "type": dtype})
        else:
            riders.append(part)
    return out, riders


# ----------------------------------------------------------------- PF2e

PF_FIELDS = {
    'perception','languages','skills','items','ac','fort','ref','will','hp',
    'immunities','weaknesses','resistances','hardness','melee','ranged','speed',
    'critical success','success','failure','critical failure','trigger','effect',
    'requirements','frequency','prerequisites','cost','range','area','targets',
    'saving throw','duration','special',
}

def pf_is_field(label):
    l = label.strip().lower().rstrip(':')
    if l in PF_FIELDS: return True
    if l.startswith('recall knowledge'): return True
    if re.match(r'^(str|dex|con|int|wis|cha)$', l): return True
    if re.search(r'\bspells?\b', l) and re.search(r'\b(innate|prepared|spontaneous|focus|rituals?)\b', l): return True
    return False


def pf_activity(sym):
    if not sym: return None
    if sym == REACT: return {"unit": "reaction", "number": 1, "symbol": sym}
    if sym == FREE:  return {"unit": "free", "number": 1, "symbol": sym}
    n = sym.count(ONE)
    if n: return {"unit": "action", "number": min(n, 3), "symbol": sym}
    return None


def pf_strip_symbol(text):
    m = re.match(r'^\s*([' + ONE + REACT + FREE + r']+)\s*', text)
    if m: return m.group(1), text[m.end():]
    return None, text


def parse_pf2e(text, rec, warn):
    text = text.replace('\r', '')
    parts = re.split(r'(?m)^---\s*$', text)
    if len(parts) < 4:
        warn.append("expected 4 sections split by '---', found %d" % len(parts))
        parts = parts + [''] * (4 - len(parts))
    head, prof, dfn, off = parts[0], parts[1], parts[2], '\n'.join(parts[3:])

    # ---- head
    m = re.search(r'(?m)^#\s+(.+?)\s*$', head)
    if m: rec['name'] = m.group(1).strip()
    m = re.search(r'(?m)^\*Creature\s+(-?\d+)\*', head)
    if m:
        lv = int(m.group(1))
        rec['challenge'] = {"kind": "level", "value": lv, "xp": None,
                            "display": "Creature %d" % lv}
    else:
        warn.append("no creature level found")
        rec['challenge'] = {"kind": "level", "value": None, "xp": None, "display": None}

    traits = []
    for line in head.split('\n'):
        line = line.strip()
        if not line or line.startswith('#') or line.startswith('*Creature'): continue
        if line.startswith('**'): continue
        traits = [t.strip().lower() for t in line.split(',') if t.strip()]
        break
    rec['identity']['nativeTraits'] = traits
    types, subs = [], []
    for t in traits:
        if t in RARITIES: rec['identity']['rarity'] = t
        elif t in SIZES: rec['identity']['size'] = SIZES[t]
        elif t in PF_ALIGN and len(t) <= 3:
            rec['identity']['alignment'] = {
                "raw": t, "lawChaos": PF_ALIGN[t][0], "goodEvil": PF_ALIGN[t][1]}
        elif t in PF_TYPES: types.append(t)
        else: subs.append(t)
    if not rec['identity']['rarity'] and traits:
        rec['identity']['rarity'] = 'common'
    rec['identity']['types'] = types
    rec['identity']['subtypes'] = subs
    if not rec['identity']['size']:
        warn.append("no size trait found")

    # ---- proficiencies
    for line in prof.split('\n'):
        line = line.strip()
        if not line: continue
        m = re.match(r'^\*\*Perception\*\*\s*(.*)$', line)
        if m:
            body = m.group(1)
            rec['perception']['mod'] = num(body.split(';')[0])
            if ';' in body:
                rec['senses'] = parse_senses_list(body.split(';', 1)[1])
            continue
        m = re.match(r'^\*\*Languages\*\*\s*(.*)$', line)
        if m:
            rec['languages'] = [x.strip().title() for x in
                                re.split(r',(?![^()]*\))', m.group(1)) if x.strip()]
            continue
        m = re.match(r'^\*\*Skills\*\*\s*(.*)$', line)
        if m:
            for tok in re.split(r',(?![^()]*\))', m.group(1)):
                mm = re.match(r'^\s*([A-Za-z][A-Za-z \'-]*?)\s*([+-]\d+)', tok)
                if mm: rec['skills'].append({"name": mm.group(1).strip(),
                                             "mod": int(mm.group(2))})
            continue
        m = re.match(r'^\*\*Recall Knowledge\s*-\s*([^*]+)\*\*\s*\(([^)]*)\)\s*:?\s*DC\s*(\d+)', line)
        if m:
            rec['systemExtras'].setdefault('recallKnowledge', []).append(
                {"category": m.group(1).strip(), "skill": m.group(2).strip(),
                 "dc": int(m.group(3))})
            continue
        if re.match(r'^\*\*STR\*\*', line, re.I):
            mods = {}
            for k, v in re.findall(r'\*\*(STR|DEX|CON|INT|WIS|CHA)\*\*\s*([+-]?\d+)', line, re.I):
                mods[k.lower()] = int(v)
            if len(mods) == 6:
                rec['abilityMods'] = mods
            else:
                warn.append("ability line incomplete (%d of 6)" % len(mods))
            continue
        m = re.match(r'^\*\*Items\*\*\s*(.*)$', line)
        if m:
            rec['systemExtras']['items'] = [x.strip() for x in m.group(1).split(',') if x.strip()]
            continue

    if rec['abilityMods'] is None:
        warn.append("no ability modifiers found")

    # ---- defenses + mid entries
    rec['entries'] += pf_section(dfn, rec, 'mid', warn, defense=True)
    # ---- offense + bot entries
    rec['entries'] += pf_section(off, rec, 'bot', warn, defense=False)
    return rec


# Degrees of success. "Critical Success" is almost always INLINE at the end of
# the ability's description; the other three normally start their own line.
DEG_RE = re.compile(r'\*\*(Critical Success|Critical Failure|Success|Failure)\*\*')
DEG_KEY = {'critical success': 'criticalSuccess', 'critical failure': 'criticalFailure',
           'success': 'success', 'failure': 'failure'}
DEG_ORDER = ['criticalSuccess', 'success', 'failure', 'criticalFailure']


def split_degrees(text):
    """Pull inline **Degree** markers out of a blob -> (description, {key: text})."""
    parts = DEG_RE.split(text or '')
    degs = {}
    for i in range(1, len(parts) - 1, 2):
        degs[DEG_KEY[parts[i].lower()]] = parts[i + 1].strip()
    return parts[0], degs


INLINE_FIELD_RE = re.compile(
    r'^\s*\*\*(Trigger|Requirements|Frequency)\*\*\s*(.*)$', re.I)


def parse_frequency(v):
    """Sources leak a serialized object here: '{"number":1,"unit":"day"}'."""
    v = (v or '').strip()
    if v.startswith('{'):
        try:
            o = json.loads(v)
            num_ = o.get('number')
            if isinstance(num_, str):
                words = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
                         'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10}
                num_ = words.get(num_.strip().lower(),
                                 int(num_) if num_.strip().isdigit() else None)
            return {"number": num_, "unit": o.get('unit'),
                    "text": None if num_ is not None else v}
        except Exception:
            pass
    return {"number": None, "unit": None, "text": v or None}


def pf_pull_inline_fields(entry, rest):
    """Peel leading **Trigger**/**Requirements**/**Frequency** off an ability body."""
    while True:
        m = INLINE_FIELD_RE.match(rest or '')
        if not m:
            break
        label, tail = m.group(1).lower(), m.group(2)
        val, rest = (tail.split(';', 1) + [''])[:2] if ';' in tail else (tail, '')
        val = val.strip()
        if label == 'trigger':
            entry.setdefault('trigger', val)
        elif label == 'requirements':
            entry.setdefault('requirements', val)
        else:
            entry['frequency'] = parse_frequency(val)
    return rest


def pf_flush(cur, out, warn=None):
    if cur is None:
        return
    degs = cur.pop('_degrees', None)
    if degs:
        # Degrees belong in save.outcomes. Some abilities print degrees without a
        # save on the same line, so defense/dc stay null rather than invented.
        sv = cur.get('save') or {"defense": None, "dc": None, "basic": False,
                                 "outcomes": {}}
        explicit = {k: v for k, v in degs.items() if v}
        if explicit:
            sv['outcomes'] = {k: degs[k] for k in DEG_ORDER if degs.get(k)}
        elif warn is not None:
            warn.append("degree-of-success labels present but empty in source (%s)"
                        % cur.get('name', '?'))
        cur['save'] = sv
    cur['entries'] = [e for e in cur['entries'] if e.strip()]
    out.append(cur)


def pf_section(block, rec, placement, warn, defense):
    entries, cur = [], None
    lines = block.split('\n')
    i = 0
    while i < len(lines):
        raw = lines[i]
        line = raw.strip()
        i += 1
        if not line:
            continue

        m = re.match(r'^\*\*([^*]+)\*\*\s*(.*)$', line)
        label = m.group(1).strip() if m else None
        body = m.group(2) if m else None

        # ---------- known fields
        if m and pf_is_field(label):
            L = label.lower().rstrip(':')
            if L == 'ac':
                v, note = value_and_note(body)
                rec['defenses']['ac']['value'] = v
                rec['defenses']['ac']['note'] = note
                pf_flush(cur, entries, warn); cur = None; continue
            if L == 'fort':
                seg = line
                for nm, key in (('Fort', 'fort'), ('Ref', 'ref'), ('Will', 'will')):
                    mm = re.search(r'\*\*%s\*\*\s*([+-]\d+)' % nm, seg)
                    if mm: rec['defenses']['savingThrows'].append(
                        {"name": key, "mod": int(mm.group(1))})
                if ';' in seg:
                    note = seg.split(';', 1)[1].strip()
                    if note: rec['defenses']['saveNote'] = note
                pf_flush(cur, entries, warn); cur = None; continue
            if L == 'hp':
                val, note = value_and_note(body)
                rec['defenses']['hp'].append({"value": val, "formula": None, "note": note})
                pf_flush(cur, entries, warn); cur = None; continue
            if L == 'immunities':
                rec['defenses']['immunities'] = classify(
                    re.split(r',(?![^()]*\))', body), CONDITIONS_PF)
                pf_flush(cur, entries, warn); cur = None; continue
            if L == 'weaknesses':
                rec['defenses']['weaknesses'] = parse_amounts(body)
                pf_flush(cur, entries, warn); cur = None; continue
            if L == 'resistances':
                rec['defenses']['resistances'] = parse_amounts(body)
                pf_flush(cur, entries, warn); cur = None; continue
            if L == 'hardness':
                rec['defenses']['hardness'] = num(body)
                pf_flush(cur, entries, warn); cur = None; continue
            if L in ('melee', 'ranged'):
                pf_flush(cur, entries, warn); cur = None
                st = pf_strike(L, body, placement, warn)
                if st: entries.append(st)
                continue
            if re.search(r'\bspells?\b', L) and re.search(r'\b(innate|prepared|spontaneous|focus|ritual)\b', L):
                pf_flush(cur, entries, warn); cur = None
                i = pf_spells(label, body, lines, i, rec)
                continue
            if L in DEG_KEY:
                if cur is not None:
                    cur.setdefault('_degrees', {})[DEG_KEY[L]] = body.strip()
                continue
            if L in ('trigger', 'requirements', 'frequency'):
                if cur is not None:
                    head, _, tail = body.partition(';')
                    if L == 'trigger':
                        cur.setdefault('trigger', head.strip())
                    elif L == 'requirements':
                        cur.setdefault('requirements', head.strip())
                    else:
                        cur['frequency'] = parse_frequency(head.strip())
                    if tail.strip(): cur['entries'].append(tail.strip())
                continue
            if L in ('effect', 'cost', 'range', 'area', 'targets',
                     'saving throw', 'duration', 'special'):
                if cur is not None:
                    cur['entries'].append("%s %s" % (label, body))
                continue
            # recall knowledge / items handled in prof; ignore here
            pf_flush(cur, entries, warn); cur = None
            continue

        # ---------- speed (unbolded)
        if not m and re.match(r'^Speed\b', line):
            modes, special = parse_speed_generic(re.sub(r'^Speed\s*', '', line))
            rec['speeds']['modes'] = modes
            rec['speeds']['special'] = special
            pf_flush(cur, entries, warn); cur = None
            continue

        # ---------- new ability
        if m:
            pf_flush(cur, entries, warn)
            sym, rest = pf_strip_symbol(body)
            traits = []
            mt = re.match(r'^\s*\(([^)]*)\)\s*', rest)
            if mt:
                traits = [t.strip() for t in mt.group(1).split(',') if t.strip()]
                rest = rest[mt.end():]
            act = pf_activity(sym)
            cat = ('reaction' if sym == REACT else
                   'free' if sym == FREE else
                   'action' if act else 'passive')
            cur = {"name": label, "category": cat, "placement": placement,
                   "activity": act, "traits": traits, "entries": []}
            rest = pf_pull_inline_fields(cur, rest)
            rest, inline_degs = split_degrees(rest)
            if inline_degs: cur.setdefault('_degrees', {}).update(inline_degs)
            pf_enrich(cur, rest)
            if rest.strip(): cur['entries'].append(rest.strip())
            continue

        # ---------- continuation
        if cur is not None:
            body_txt, inline_degs = split_degrees(line)
            if inline_degs: cur.setdefault('_degrees', {}).update(inline_degs)
            if body_txt.strip(): cur['entries'].append(body_txt.strip())

    pf_flush(cur, entries, warn)
    return entries


def pf_enrich(entry, text):
    m = re.search(r'(\d+)-foot\s*(cone|line|burst|emanation|radius|cube|cylinder)', text, re.I)
    if m:
        entry['area'] = {"shape": m.group(2).lower(), "size": int(m.group(1)), "unit": "ft"}
    m = re.search(r'DC\s*(\d+)\s*(basic\s+)?(Fortitude|Reflex|Will)', text, re.I)
    if m:
        entry['save'] = {"defense": m.group(3).lower(), "dc": int(m.group(1)),
                         "basic": bool(m.group(2)), "outcomes": {}}
        if m.group(2):
            entry['save']['outcomes'] = {"criticalSuccess": "none", "success": "half",
                                         "failure": "full", "criticalFailure": "double"}
    else:
        m = re.search(r'(\d+)\s*feet,\s*DC\s*(\d+)', text)
        if m:
            entry['aura'] = {"range": int(m.group(1)), "unit": "ft"}
            entry['save'] = {"defense": "will", "dc": int(m.group(2)),
                             "basic": False, "outcomes": {}}
    if 'aura' not in entry:
        m = re.search(r'(\d+)\s*feet', text)
        if m and 'aura' in [t.lower() for t in entry.get('traits', [])]:
            entry['aura'] = {"range": int(m.group(1)), "unit": "ft"}
    m = re.search(r'(\d+d\d+)\s+([a-z]+)\s+damage', text, re.I)
    if m:
        entry['damage'] = [{"formula": m.group(1), "average": None, "type": m.group(2).lower()}]
    m = re.search(r"can'?t use .*? again for (\d*d?\d+)\s*(rounds?|minutes?)", text, re.I)
    if m:
        entry['recharge'] = {"kind": "dice", "formula": m.group(1), "unit": m.group(2).lower()}


def pf_strike(kind, body, placement, warn):
    sym, rest = pf_strip_symbol(body)
    m = re.match(r'^\s*(.+?)\s*([+-]\d+)((?:\s*/\s*[+-]\d+)*)\s*(?:\(([^)]*)\))?\s*(.*)$', rest)
    if not m:
        warn.append("unparsed strike: %s" % rest[:60])
        return None
    name = m.group(1).strip()
    first = int(m.group(2))
    chain = [first] + [int(x) for x in re.findall(r'[+-]\d+', m.group(3) or '')]
    traits = [t.strip() for t in (m.group(4) or '').split(',') if t.strip()]
    tail = m.group(5) or ''

    reach = None; rng = None
    for t in list(traits):
        mr = re.match(r'reach\s*<?\s*(\d+)\s*feet?\s*>?', t, re.I)
        if mr: reach = {"value": int(mr.group(1)), "unit": "ft"}
        mg = re.match(r'range(?:\s+increment)?\s*<?\s*(\d+)\s*feet?\s*>?', t, re.I)
        if mg: rng = {"value": int(mg.group(1)), "unit": "ft"}
        # PF2e prints thrown-weapon range as the trait "thrown <10 feet>"
        mth = re.match(r'thrown\s*<?\s*(\d+)\s*feet?\s*>?', t, re.I)
        if mth and not rng:
            rng = {"value": int(mth.group(1)), "unit": "ft", "thrown": True}

    dmg, riders = [], []
    md = re.search(r'\*\*Damage\*\*\s*(.*)$', tail)
    if md:
        dmg, riders = dmg_components(md.group(1))

    act = pf_activity(sym) or {"unit": "action", "number": 1, "symbol": sym}
    entry = {
        "name": name, "category": "strike", "placement": placement,
        "activity": act, "traits": [],
        "attack": {"range": "melee" if kind == 'melee' else "ranged",
                   "subtype": None, "bonus": first, "map": chain,
                   "traits": traits, "targets": None},
        "damage": dmg, "entries": [],
    }
    if reach: entry['attack']['reach'] = reach
    if rng: entry['attack']['range_'] = rng
    if riders: entry['entries'] = riders
    return entry


def pf_spells(label, body, lines, i, rec):
    block = {"name": label.strip(), "type": "innate", "tradition": None,
             "dc": None, "attackBonus": None, "ability": None, "levels": []}
    lab = label.lower()
    for t in ('arcane', 'divine', 'occult', 'primal'):
        if t in lab: block['tradition'] = t
    for t in ('innate', 'prepared', 'spontaneous', 'focus', 'ritual'):
        if t in lab: block['type'] = t
    block['dc'] = num(re.search(r'DC\s*(\d+)', body or '').group(1)) if re.search(r'DC\s*(\d+)', body or '') else None
    ma = re.search(r'attack\s*([+-]\d+)', body or '', re.I)
    if ma: block['attackBonus'] = int(ma.group(1))

    while i < len(lines):
        nxt = lines[i]
        s = nxt.strip()
        if not s:
            i += 1
            if i < len(lines) and not lines[i].startswith('  '): break
            continue
        if not nxt.startswith(' ') and not re.match(r'^\s*\*\*(Cantrips?|\d+(st|nd|rd|th))', nxt):
            break
        mm = re.match(r'^\s*\*\*([^*]+)\*\*\s*(.*)$', s)
        if not mm: break
        rank_raw = mm.group(1).strip()
        mr = re.search(r'(\d+)', rank_raw)
        rank = int(mr.group(1)) if mr else rank_raw
        spells = []
        for tok in re.split(r',(?![^()]*\))', mm.group(2)):
            tok = tok.strip()
            if not tok: continue
            uses = None
            mu = re.search(r'\(\s*[x×]\s*(\d+)\s*\)', tok, re.I)
            if mu:
                uses = int(mu.group(1)); tok = re.sub(r'\([^)]*\)', '', tok).strip()
            elif re.search(r'\(at will\)', tok, re.I):
                uses = "at will"; tok = re.sub(r'\([^)]*\)', '', tok).strip()
            if tok: spells.append({"name": tok, "uses": uses})
        block['levels'].append({"rank": rank, "rankLabel": rank_raw, "spells": spells})
        i += 1
    rec['spellcasting'].append(block)
    return i


# ----------------------------------------------------------------- 5e

ALIGN_WORDS = [
    'lawful good','neutral good','chaotic good','lawful neutral','chaotic neutral',
    'lawful evil','neutral evil','chaotic evil','true neutral','unaligned','neutral',
    'any alignment','any non-good alignment','any non-lawful alignment',
    'any chaotic alignment','any evil alignment','any non-evil alignment',
]
SECTION_MAP = {
    'special abilities': 'traits', 'traits': 'traits', 'trait': 'traits',
    'actions': 'actions', 'action': 'actions',
    'bonus actions': 'bonusActions', 'bonus action': 'bonusActions',
    'reactions': 'reactions', 'reaction': 'reactions',
    'legendary actions': 'legendary', 'legendary action': 'legendary',
    'mythic actions': 'mythic', 'lair actions': 'lair',
}
CAT_FOR = {'traits': 'passive', 'actions': 'action', 'bonusActions': 'action',
           'reactions': 'reaction', 'legendary': 'legendary',
           'mythic': 'mythic', 'lair': 'lair'}
UNIT_FOR = {'traits': None, 'actions': 'action', 'bonusActions': 'bonus',
            'reactions': 'reaction', 'legendary': 'legendary',
            'mythic': 'mythic', 'lair': 'lair'}


def parse_5e(text, rec, warn):
    text = text.replace('\r', '')
    lines = text.split('\n')

    m = re.search(r'(?m)^#\s+(.+?)\s*$', text)
    if m: rec['name'] = m.group(1).strip()

    # ---- identity line: first italic-only line
    for l in lines[1:14]:
        s = l.strip()
        if not s or s.startswith('#') or s.startswith('**') or s.startswith('|'): continue
        if s.startswith('*') and s.endswith('*'):
            parse_5e_identity(s, rec, warn)
            break

    # ---- field labels
    body_start = 0
    for idx, l in enumerate(lines):
        s = l.strip()
        m = re.match(r'^\*\*([^*]+?)[:\.]?\*\*\s*:?\s*(.*)$', s)
        if not m: continue
        label = m.group(1).strip().lower().rstrip(':')
        val = m.group(2).strip()
        if label == 'armor class':
            v, note = value_and_note(val)
            rec['defenses']['ac']['value'] = v
            rec['defenses']['ac']['note'] = note
        elif label == 'hit points':
            f = re.search(r'\(([^)]*)\)', val)
            rec['defenses']['hp'].append({
                "value": num(val), "note": None,
                "formula": re.sub(r'\s+', '', f.group(1)) if f else None})
        elif label == 'speed':
            modes, special = parse_5e_speed(val)
            rec['speeds']['modes'] = modes
            rec['speeds']['special'] = special
        elif label in ('challenge rating', 'cr', 'challenge'):
            parse_5e_cr(val, rec)
        elif label == 'source':
            rec['source']['name'] = val.split(',')[0].strip()
            p = re.search(r'page\s*(\d+)', val, re.I)
            if p: rec['source']['page'] = int(p.group(1))
        elif label == 'saving throws':
            for nm, mod in re.findall(r'([A-Za-z]{3})\s*([+-]\d+)', val):
                rec['defenses']['savingThrows'].append(
                    {"name": nm.lower(), "mod": int(mod)})
        elif label == 'skills':
            for tok in re.split(r',(?![^()]*\))', val):
                mm = re.match(r'^\s*([A-Za-z][A-Za-z \'-]*?)\s*([+-]\d+)', tok)
                if mm: rec['skills'].append(
                    {"name": mm.group(1).strip().title(), "mod": int(mm.group(2))})
        elif label == 'senses':
            sv = val
            mp = re.search(r'passive\s+Perception\s*(\d+)', sv, re.I)
            if mp:
                rec['perception']['passive'] = int(mp.group(1))
                sv = re.sub(r';?\s*passive\s+Perception\s*\d+', '', sv, flags=re.I)
            rec['senses'] = parse_senses_list(sv)
        elif label == 'languages':
            rec['languages'] = [x.strip() for x in re.split(r',(?![^()]*\))', val)
                                if x.strip() and x.strip() not in ('—', '-', '--')]
        elif label == 'damage immunities':
            rec['defenses']['immunities']['damage'] = split_list(val)
        elif label == 'condition immunities':
            rec['defenses']['immunities']['conditions'] = split_list(val)
        elif label == 'immunities':
            toks = []
            for chunk in val.split(';'): toks += split_list(chunk)
            rec['defenses']['immunities'] = classify(toks, CONDITIONS_5E)
        elif label == 'damage resistances' or label == 'resistances':
            rec['defenses']['resistances'] = [{"name": x, "amount": None, "note": None}
                                              for x in split_list(val)]
        elif label == 'damage vulnerabilities' or label == 'vulnerabilities':
            rec['defenses']['weaknesses'] = [{"name": x, "amount": None, "note": None}
                                             for x in split_list(val)]
        elif label == 'perception' and rec['perception']['mod'] is None:
            rec['perception']['mod'] = num(val)
        elif label == 'initiative':
            rec['systemExtras']['initiative'] = num(val)

    # ---- ability table
    parse_5e_abilities(lines, rec, warn)

    # Perception in 5e lives in the Skills line; mirror it onto perception.mod
    if rec['perception']['mod'] is None:
        for sk in rec['skills']:
            if sk['name'].lower() == 'perception':
                rec['perception']['mod'] = sk['mod']
                break

    # ---- entries
    rec['entries'] = parse_5e_entries(lines, rec, warn)

    # ---- structured spellcasting (5e keeps the list inside the ability text)
    rec['spellcasting'] = extract_5e_spellcasting(rec['entries'], warn)
    return rec


# 5e spell-list line shapes, all present in this corpus:
#   "Cantrips (at will): a, b"      "3rd level (3 slots): a, b"
#   "4th-level (1 slot): a"         "At Will: a, b"
#   "3/day each: a, b"              "1/Day: a"
SPELL_SLOT_RE = re.compile(
    r'^(cantrips?|(\d+)\s*(?:st|nd|rd|th))[\s\-]*(?:level)?\s*'
    r'(?:\(([^)]*)\))?\s*:\s*(.*)$', re.I)
SPELL_USES_RE = re.compile(
    r'^(at\s+will|(\d+)\s*/\s*day(?:\s*(?:each|ea)\.?)?)\s*:\s*(.*)$', re.I)
# No \b before the marker: compact sources run spells straight into the next
# tier ("silent image3/day: major image"), so a word boundary never occurs.
SPELL_SPLIT_RE = re.compile(r'(?i)(at\s+will|\d+\s*/\s*day(?:\s*(?:each|ea)\.?)?)\s*:')


def _spell_names(blob):
    out = []
    for tok in re.split(r',(?![^()]*\))', blob):
        tok = re.sub(r'\*+', '', tok).strip().strip('.;')
        if tok:
            out.append({"name": tok, "uses": None})
    return out


def extract_5e_spellcasting(entries, warn):
    """Lift the spell list out of a 5e Spellcasting ability into spellcasting[]."""
    blocks = []
    for e in entries:
        nm = e.get('name', '')
        if 'spellcast' not in nm.lower():
            continue
        text = ' '.join(e.get('entries', []))
        block = {"name": nm, "type": 'innate' if 'innate' in (nm + text).lower()
                 else 'prepared', "tradition": None, "dc": None,
                 "attackBonus": None, "ability": None, "levels": []}

        m = (re.search(r'spell save DC\s*(\d+)', text, re.I) or
             re.search(r'\(\s*DC\s*(\d+)', text, re.I))
        if m: block['dc'] = int(m.group(1))
        m = re.search(r'([+-]\d+)\s*to hit with spell attacks', text, re.I)
        if m: block['attackBonus'] = int(m.group(1))
        m = re.search(r'\b(Intelligence|Wisdom|Charisma|Int|Wis|Cha)\b', text)
        if m: block['ability'] = {'intelligence': 'int', 'wisdom': 'wis',
                                  'charisma': 'cha'}.get(m.group(1).lower(),
                                                         m.group(1).lower())

        for raw in e.get('entries', []):
            # de-bold BEFORE stripping bullets, or "**At Will:**" loses one
            # asterisk to the bullet rule and stops matching.
            s = re.sub(r'\*\*', '', raw.strip())
            s = re.sub(r'^[\*\-•]\s+', '', s).strip()
            s = re.sub(r'\*', '', s)

            ms = SPELL_SLOT_RE.match(s)
            if ms and (ms.group(2) or ms.group(1).lower().startswith('cantrip')):
                rank = 0 if ms.group(1).lower().startswith('cantrip') else int(ms.group(2))
                paren = (ms.group(3) or '').strip()
                slots = None
                mslot = re.search(r'(\d+)\s*slot', paren, re.I)
                if mslot: slots = int(mslot.group(1))
                lvl = {"rank": rank, "rankLabel": s.split(':', 1)[0].strip(),
                       "spells": _spell_names(ms.group(4))}
                if slots is not None: lvl['slots'] = slots
                if re.search(r'at\s*will', paren, re.I): lvl['uses'] = "at will"
                block['levels'].append(lvl)
                continue

            mu = SPELL_USES_RE.match(s)
            if mu:
                uses = "at will" if mu.group(2) is None else int(mu.group(2))
                block['levels'].append({"rank": None,
                                        "rankLabel": s.split(':', 1)[0].strip(),
                                        "uses": uses,
                                        "spells": _spell_names(mu.group(3))})
                continue

            # compact third-party form: "Cha (DC 13) ... At will: a b3/day: c"
            parts = SPELL_SPLIT_RE.split(s)
            if len(parts) > 1:
                ambiguous = False
                for i in range(1, len(parts) - 1, 2):
                    marker, blob = parts[i].strip(), parts[i + 1]
                    uses = ("at will" if marker.lower().startswith('at')
                            else int(re.search(r'\d+', marker).group(0)))
                    names = _spell_names(blob)
                    # only genuinely ambiguous when the source ran spells together
                    # with no comma at all and the blob is clearly multi-spell
                    if ',' not in blob and len(blob.split()) > 3:
                        ambiguous = True
                    block['levels'].append({"rank": None, "rankLabel": marker,
                                            "uses": uses, "spells": names})
                if ambiguous:
                    warn.append("compact spell list; spell separators absent in source")
                continue

            # bare continuation line under the previous level (A5E splits one per line)
            if block['levels'] and s and ':' not in s and len(s) < 60 \
                    and not s.endswith('.'):
                block['levels'][-1]['spells'].extend(_spell_names(s))

        if block['levels'] or block['dc'] is not None:
            blocks.append(block)
    return blocks


def split_list(v):
    return [x.strip() for x in re.split(r',(?![^()]*\))', v) if x.strip()
            and x.strip() not in ('—', '-', '--')]


def parse_5e_identity(s, rec, warn):
    raw = re.sub(r'\*', ' ', s)
    raw = re.sub(r'\s{2,}', ' ', raw).strip().strip(',')
    rec['identity']['alignment']['raw'] = None
    low = raw.lower()
    m = re.match(r'^(tiny|small|medium|large|huge|gargantuan|titanic)\b\s*(.*)$', low)
    if m:
        rec['identity']['size'] = SIZES[m.group(1)]
        rest_low = m.group(2)
        rest = raw[len(raw) - len(m.group(2)):] if m.group(2) else ''
    else:
        warn.append("no size in identity line: %r" % raw[:50])
        rest, rest_low = raw, low

    tag = None
    mt = re.search(r'\(([^)]*)\)', rest)
    if mt:
        tag = mt.group(1).strip()
        rest = re.sub(r'\s*\([^)]*\)', '', rest)
        rest_low = rest.lower()

    align = None
    for a in sorted(ALIGN_WORDS, key=len, reverse=True):
        if rest_low.endswith(a):
            align = rest[len(rest) - len(a):]
            rest = rest[:len(rest) - len(a)].strip().strip(',')
            break
    if align:
        rec['identity']['alignment']['raw'] = align.strip()
        al = align.lower()
        rec['identity']['alignment']['lawChaos'] = next(
            (w for w in ('lawful', 'chaotic', 'neutral') if al.startswith(w)), None)
        rec['identity']['alignment']['goodEvil'] = next(
            (w for w in ('good', 'evil') if al.endswith(w)),
            'neutral' if 'neutral' in al else None)

    t = rest.strip().strip(',').strip()
    rec['identity']['types'] = [t.lower()] if t else []
    rec['identity']['subtypes'] = [tag.lower()] if tag else []


def parse_5e_speed(val):
    modes, special = {}, []
    for m in re.finditer(r'([A-Za-z]+)?\s*(\d+)\s*(?:ft\.?|feet|\')', val, re.I):
        mode = (m.group(1) or 'walk').lower()
        if mode in ('and', 'or', 'ft', 'feet'): mode = 'walk'
        if mode in KNOWN_MODES:
            modes[mode] = int(m.group(2))
        else:
            special.append(m.group(0).strip())
    for extra in re.findall(r'\(([^)]*)\)', val):
        special.append(extra.strip())
    return modes, special


def parse_5e_cr(val, rec):
    m = re.match(r'\s*([\d/]+)', val)
    v = None
    if m:
        s = m.group(1)
        if '/' in s:
            a, b = s.split('/')
            try: v = round(float(a) / float(b), 4)
            except Exception: v = None
        else:
            try: v = int(s)
            except Exception: v = None
    xp = None
    mx = re.search(r'([\d,]+)\s*XP', val, re.I) or re.search(r'XP\s*([\d,]+)', val, re.I)
    if mx: xp = int(mx.group(1).replace(',', ''))
    rec['challenge'] = {"kind": "cr", "value": v, "xp": xp,
                        "display": m.group(1) if m else val.strip()}


def parse_5e_abilities(lines, rec, warn):
    order = ['str', 'dex', 'con', 'int', 'wis', 'cha']
    for idx, l in enumerate(lines):
        s = l.strip()
        if re.match(r'^\|\s*STAT\s*\|', s, re.I):
            mods, scores, saves = {}, {}, []
            for j in range(idx + 1, min(idx + 10, len(lines))):
                row = lines[j].strip()
                if not row.startswith('|'): break
                cells = [c.strip() for c in row.strip('|').split('|')]
                if len(cells) < 3 or cells[0].lower().startswith('---'): continue
                k = cells[0].lower()
                if k not in order: continue
                scores[k] = num(cells[1])
                mods[k] = num(cells[2])
                if len(cells) > 3 and re.search(r'\d', cells[3]):
                    saves.append({"name": k, "mod": num(cells[3])})
            if len(mods) == 6:
                rec['abilityMods'] = mods
                rec['abilityScores'] = scores if all(
                    isinstance(v, int) and v > 0 for v in scores.values()) else None
                if saves and not rec['defenses']['savingThrows']:
                    rec['defenses']['savingThrows'] = saves
            else:
                warn.append("STAT table incomplete")
            return
        if re.match(r'^\|\s*STR\s*\|', s, re.I):
            for j in range(idx + 1, min(idx + 5, len(lines))):
                row = lines[j].strip()
                if not row.startswith('|'): continue
                cells = [c.strip() for c in row.strip('|').split('|')]
                if cells and cells[0].startswith('---'): continue
                if len(cells) < 6: continue
                mods, scores, ok = {}, {}, True
                for k, cell in zip(order, cells[:6]):
                    mm = re.match(r'^(\d+)\s*\(\s*([+-]?\d+)\s*\)$', cell)
                    if mm:
                        scores[k] = int(mm.group(1)); mods[k] = int(mm.group(2))
                        continue
                    mm = re.match(r'^([+-]\d+)$', cell)
                    if mm:
                        mods[k] = int(mm.group(1)); scores = None
                        continue
                    mm = re.match(r'^(\d+)$', cell)
                    if mm:
                        scores[k] = int(mm.group(1))
                        mods[k] = (int(mm.group(1)) - 10) // 2
                        continue
                    ok = False; break
                if ok and len(mods) == 6:
                    rec['abilityMods'] = mods
                    rec['abilityScores'] = scores if scores and len(scores) == 6 else None
                    return
            warn.append("STR table unparsed")
            return
    warn.append("no ability table found")


def parse_5e_entries(lines, rec, warn):
    out, cur, placement = [], None, None

    def flush():
        nonlocal cur
        if cur is not None:
            cur['entries'] = [x for x in cur['entries'] if x.strip()]
            out.append(cur)
            cur = None

    for l in lines:
        s = l.strip()
        mh = re.match(r'^#{2,4}\s*(.+?)\s*$', s)
        if mh:
            flush()
            placement = SECTION_MAP.get(mh.group(1).strip().lower())
            if placement is None:
                placement = kebab(mh.group(1)) or 'other'
            continue
        if placement is None:
            continue
        if not s:
            continue

        # Preamble sits in either section and is bolded in some dialects;
        # catch it before the entry matcher can claim it as an entry name.
        plain = re.sub(r'\*+', '', s)
        if re.search(r'can take\s+\d+\s+legendary actions?', plain, re.I):
            rec['systemExtras']['legendaryPreamble'] = plain.strip()
            mn = re.search(r'can take\s+(\d+)\s+legendary actions?', plain, re.I)
            if mn: rec['systemExtras']['legendaryActionsPerRound'] = int(mn.group(1))
            flush()
            continue
        mu = re.search(r'legendary action uses?\s*:\s*(\d+)', plain, re.I)
        if mu:
            rec['systemExtras']['legendaryPreamble'] = plain.strip()
            rec['systemExtras']['legendaryActionsPerRound'] = int(mu.group(1))
            flush()
            continue

        m = (re.match(r'^\*\*\*([^*]+?)[:\.]?\*\*\*\s*(.*)$', s) or
             re.match(r'^\*\*([^*]+?)[:\.]?\*\*\s*:?\s*(.*)$', s))
        if m and not re.match(r'^(At Will|1/Day|2/Day|3/Day|Cantrip)', m.group(1), re.I):
            flush()
            name = m.group(1).strip()
            body = m.group(2).strip()
            cur = build_5e_entry(name, body, placement)
            continue

        if cur is not None:
            cur['entries'].append(s)
    flush()
    return out


def build_5e_entry(name, body, placement):
    cat = CAT_FOR.get(placement, 'action')
    unit = UNIT_FOR.get(placement, 'action')
    number = 1
    entry = {"name": name, "category": cat, "placement": placement,
             "activity": None, "traits": [], "entries": []}

    mc = re.search(r'Costs?\s+(\d+)\s+Actions?', name, re.I)
    if mc:
        number = min(int(mc.group(1)), 3)
        entry['name'] = re.sub(r'\s*\(\s*Costs?\s+\d+\s+Actions?\s*\)', '', name).strip()

    mr = re.search(r'Recharge\s*(\d)\s*[-–]\s*(\d)', name, re.I)
    if mr:
        entry['recharge'] = {"kind": "d6-range", "min": int(mr.group(1)),
                             "max": int(mr.group(2)),
                             "display": "Recharge %s-%s" % (mr.group(1), mr.group(2))}
        entry['name'] = re.sub(r'\s*\(\s*Recharge[^)]*\)', '', entry['name']).strip()
    else:
        mr = re.search(r'Recharge\s*(\d)\s*\)', name, re.I)
        if mr:
            entry['recharge'] = {"kind": "d6-range", "min": int(mr.group(1)), "max": 6,
                                 "display": "Recharge %s" % mr.group(1)}
            entry['name'] = re.sub(r'\s*\(\s*Recharge[^)]*\)', '', entry['name']).strip()

    mu = re.search(r'\((\d+)\s*/\s*(Day|Turn|Round|Rest|Short Rest|Long Rest)', name, re.I)
    if mu:
        entry['uses'] = {"count": int(mu.group(1)), "period": mu.group(2).lower(),
                         "display": mu.group(0).strip('(')}
        entry['name'] = re.sub(r'\s*\([^)]*\)\s*$', '', entry['name']).strip()

    if unit:
        entry['activity'] = {"unit": unit, "number": number, "symbol": None}

    ma = re.search(r'(Melee|Ranged)(?:\s+or\s+(?:Melee|Ranged))?\s*'
                   r'(Weapon|Spell)?\s*Attack(?:\s+Roll)?\s*:?\*?\s*:?\s*([+-]\d+)',
                   body, re.I)
    if ma:
        entry['category'] = 'strike' if placement in ('actions', 'bonusActions') else cat
        reach = re.search(r'reach\s*(\d+)\s*(?:ft|feet)', body, re.I)
        rng = re.search(r'range\s*(\d+)(?:/(\d+))?\s*(?:ft|feet)', body, re.I)
        tgt = re.search(r'(one target|one creature|two targets|[^.]*?targets?)\.', body, re.I)
        entry['attack'] = {
            "range": "melee" if ma.group(1).lower() == 'melee' else "ranged",
            "subtype": (ma.group(2) or '').lower() or None,
            "bonus": int(ma.group(3)), "map": [int(ma.group(3))],
            "traits": [], "targets": tgt.group(1).strip() if tgt else None}
        if reach: entry['attack']['reach'] = {"value": int(reach.group(1)), "unit": "ft"}
        if rng: entry['attack']['range_'] = {"value": int(rng.group(1)), "unit": "ft"}

    dmg = []
    for avg, formula, dtype in re.findall(
            r'(\d+)\s*\((\d+d\d+(?:\s*[+-]\s*\d+)?)\)\s*([A-Za-z]+)\s*damage', body, re.I):
        dmg.append({"formula": re.sub(r'\s+', '', formula), "average": int(avg),
                    "type": dtype.lower()})
    if not dmg:
        for formula, dtype in re.findall(
                r'(\d+d\d+(?:\s*[+-]\s*\d+)?)\s*([A-Za-z]+)\s*damage', body, re.I):
            dmg.append({"formula": re.sub(r'\s+', '', formula), "average": None,
                        "type": dtype.lower()})
    if dmg: entry['damage'] = dmg

    ms = (re.search(r'DC\s*(\d+)\s*([A-Za-z]+)\s*saving throw', body, re.I) or
          re.search(r'([A-Za-z]+)\s*Saving Throw\s*\*?\s*:?\s*DC\s*(\d+)', body, re.I))
    if ms:
        g = ms.groups()
        if g[0].isdigit(): dc, dfn = int(g[0]), g[1]
        else: dc, dfn = int(g[1]), g[0]
        outcomes = {}
        if re.search(r'half as much|Half damage|half the damage', body, re.I):
            outcomes = {"success": "half", "failure": "full"}
        elif re.search(r'\bor\b', body):
            outcomes = {"success": "none", "failure": "full"}
        d = dfn.lower()
        entry['save'] = {"defense": ABBR.get(d, d[:12]), "dc": dc, "basic": False,
                         "outcomes": outcomes}

    marea = re.search(r'(\d+)[- ]f(?:oo|ee)t(?:[- ]radius)?\s*'
                      r'(cone|line|sphere|cube|cylinder|emanation|radius)', body, re.I)
    if marea:
        shape = marea.group(2).lower()
        entry['area'] = {"shape": 'sphere' if shape == 'radius' else shape,
                         "size": int(marea.group(1)), "unit": "ft"}
    elif re.search(r'within\s+(\d+)\s*(?:ft|feet)', body, re.I) and placement == 'legendary':
        mw = re.search(r'within\s+(\d+)\s*(?:ft|feet)', body, re.I)
        entry['area'] = {"shape": "emanation", "size": int(mw.group(1)), "unit": "ft"}

    mcond = re.search(r'\b(be|becomes?|is)\s+(?:knocked\s+)?'
                      r'(prone|blinded|charmed|deafened|frightened|grappled|incapacitated|'
                      r'paralyzed|petrified|poisoned|restrained|stunned|unconscious)\b',
                      body, re.I)
    if mcond:
        dur = re.search(r'for\s+(1\s+minute|1\s+hour|\d+\s+\w+)', body, re.I)
        entry['condition'] = {"name": mcond.group(2).lower(),
                              "duration": dur.group(1) if dur else None,
                              "repeatSave": None}

    if body: entry['entries'].append(body)
    return entry


# ----------------------------------------------------------------- driver

def out_name(system, folder, stem):
    s = SFX.get(folder)
    if s and stem.endswith(s): stem = stem[:-len(s)]
    variant = VAR5E[folder] if system == '5e' else folder
    return "%s-%s-%s.json" % (kebab(stem), kebab(variant), system)


# --- markdown emphasis -------------------------------------------------------
# Source prose carries *italic* and **bold** runs that are formatting, not
# content, and they were reaching display text as literal asterisks
# ("*Melee Attack Roll:*"). Underscore emphasis ("_mage armor_") is the same
# artifact with a different marker.
#
# This runs on the FINISHED record, never on the source text: the field regexes,
# the section splitters and the "**" line tests all key on these markers to find
# labels, so stripping earlier would blind the parsers.
#
# The \S guards mean a marker has to hug its text, which leaves markdown list
# bullets ("* Cantrips (at will): ...") and lone footnote markers alone.
EMPH_STAR = re.compile(r'\*{1,3}(?=\S)(.+?)(?<=\S)\*{1,3}')
EMPH_UNDER = re.compile(r'(?<![A-Za-z0-9_])_(?=\S)([^_\n]+?)(?<=\S)_(?![A-Za-z0-9_])')
VERBATIM_KEYS = {'path', 'id', 'schema'}


def strip_emphasis(s):
    if '*' in s:
        s = EMPH_STAR.sub(r'\1', s)
    if '_' in s:
        s = EMPH_UNDER.sub(r'\1', s)
    return s


def clean_record(node, key=None):
    """Walk a built record, dropping emphasis markers from every display string."""
    if isinstance(node, str):
        return node if key in VERBATIM_KEYS else strip_emphasis(node)
    if isinstance(node, list):
        return [clean_record(v, key) for v in node]
    if isinstance(node, dict):
        return {k: clean_record(v, k) for k, v in node.items()}
    return node


def convert_file(path, system, folder, stem, rel):
    rec = blank_record()
    warn = []
    text = open(path, encoding='utf-8', errors='replace').read()
    variant = VAR5E[folder] if system == '5e' else folder
    rec['gameSystem'] = 'dnd5e' if system == '5e' else 'pf2e'
    rec['variant'] = variant
    rec['source']['code'] = folder
    rec['source']['path'] = rel
    try:
        if system == 'pf2e':
            parse_pf2e(text, rec, warn)
        else:
            parse_5e(text, rec, warn)
    except Exception as e:
        warn.append("parser exception: %s: %s" % (type(e).__name__, e))
        rec['parse']['status'] = 'failed'

    if not rec['name']:
        rec['name'] = stem.replace('-', ' ').replace('_', ' ').title()
        warn.append("no name heading; derived from filename")
    # id uses the same suffix-stripped stem as the filename, so the two agree
    idstem = stem
    _sfx = SFX.get(folder)
    if _sfx and idstem.endswith(_sfx):
        idstem = idstem[:-len(_sfx)]
    rec['id'] = "%s:%s:%s" % (rec['gameSystem'], kebab(variant), kebab(idstem))
    if not rec['defenses']['hp']:
        rec['defenses']['hp'].append({"value": None, "formula": None, "note": None})
        warn.append("no HP found")
    if rec['defenses']['ac']['value'] is None:
        warn.append("no AC found")
    if not rec['entries']:
        warn.append("no abilities or actions parsed")

    if rec['parse']['status'] != 'failed':
        rec['parse']['status'] = 'partial' if warn else 'ok'
    rec['parse']['warnings'] = warn
    return clean_record(rec)


def main():
    root = os.path.dirname(os.path.abspath(__file__))
    mon = os.path.join(root, 'monsters')
    stats = collections.Counter()
    warncount = collections.Counter()
    written = []
    for system in ('5e', 'pf2e'):
        base = os.path.join(mon, system)
        if not os.path.isdir(base): continue
        for folder in sorted(os.listdir(base)):
            fdir = os.path.join(base, folder)
            if not os.path.isdir(fdir) or folder.startswith("_"): continue
            for fn in sorted(os.listdir(fdir)):
                if not fn.endswith('.md'): continue
                stem = fn[:-3]
                src = os.path.join(fdir, fn)
                rel = "monsters/%s/%s/%s" % (system, folder, fn)
                rec = convert_file(src, system, folder, stem, rel)
                dst = os.path.join(fdir, out_name(system, folder, stem))
                with open(dst, 'w', encoding='utf-8') as fh:
                    json.dump(rec, fh, indent=2, ensure_ascii=False)
                stats[rec['parse']['status']] += 1
                stats['total'] += 1
                for w in rec['parse']['warnings']:
                    warncount[re.sub(r'[:(].*$', '', w).strip()[:60]] += 1
                written.append(dst)
    print(json.dumps({"stats": dict(stats),
                      "top_warnings": warncount.most_common(25)}, indent=2))


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Convert D&D 5e and Pathfinder 2e spell markdown into ttrpg-spell/0.1 JSON.

Writes a sidecar .json next to each .md. Never deletes or modifies markdown.
Naming: <kebab-stem>-<variant>-<system>.json
"""
import os, re, json, sys, collections

SCHEMA_VER = "ttrpg-spell/0.1"

VAR5E = {'5.1_srd': 'srd51', '5.2_srd': 'srd52',
         'deep_magic': 'deepmagic', 'level_up_advanced': 'a5e'}
SFX = {'level_up_advanced': '-a5e'}

# NOTE: [ \t]* not \s* — \s* matches newlines, so an empty value swallows the
# NEXT line and that field is lost. 96 files in this corpus have empty values.
FIELD_RE = re.compile(r'(?m)^-\s+\*\*([^*]+)\*\*[ \t]*:[ \t]*(.*)$')

SCHOOLS = {s.lower(): s for s in [
    "Abjuration", "Conjuration", "Divination", "Enchantment",
    "Evocation", "Illusion", "Necromancy", "Transmutation"]}

RARITIES = {'common', 'uncommon', 'rare', 'unique'}
TRADITIONS = {'arcane', 'divine', 'occult', 'primal'}

ONE, REACT, FREE = '◆', '◈', '◇'

COMPONENT_MAP = {
    'v': 'verbal', 'verbal': 'verbal',
    's': 'somatic', 'somatic': 'somatic',
    'm': 'material', 'material': 'material',
    'f': 'focus', 'focus': 'focus',
}

DEG_RE = re.compile(r'^\*\*(Critical Success|Critical Failure|Success|Failure)\*\*[ \t]*(.*)$')
DEG_KEY = {'critical success': 'criticalSuccess', 'critical failure': 'criticalFailure',
           'success': 'success', 'failure': 'failure'}
DEG_ORDER = ['criticalSuccess', 'success', 'failure', 'criticalFailure']

TIME_UNITS = {'action': 'action', 'actions': 'action', 'bonus': 'bonus',
              'reaction': 'reaction', 'reactions': 'reaction', 'free': 'free',
              'minute': 'minute', 'minutes': 'minute', 'hour': 'hour',
              'hours': 'hour', 'day': 'day', 'days': 'day', 'week': 'week',
              'month': 'month', 'year': 'year', 'round': 'round', 'turn': 'turn'}


def kebab(s):
    s = re.sub(r"[_\s]+", "-", s.strip().lower())
    s = re.sub(r"[^a-z0-9\-]", "", s)
    return re.sub(r"-{2,}", "-", s).strip('-')


# PF2e text carries wiki-link artifacts where the braces were stripped upstream:
#   "dazzled|PC1"  /  "persistent damage|PC1|persistent acid damage"
# Without the braces the run has no reliable end boundary, so trying to pick the
# display text truncates sentences. Strip ONLY the source-code token — that is
# lossless — and leave anything else exactly as written.
SRC_CODE_RE = re.compile(r'\|(?:[A-Z][A-Za-z0-9]{1,6}|remaster)\b')


def clean_links(t):
    if '|' not in t:
        return t
    return SRC_CODE_RE.sub('', t)


def num(s, default=None):
    if s is None: return default
    m = re.search(r'-?\d+(?:\.\d+)?', str(s).replace(',', ''))
    if not m: return default
    v = float(m.group(0))
    return int(v) if v == int(v) else v


def blank_record():
    return {
        "schema": SCHEMA_VER, "id": None, "name": None, "gameSystem": None,
        "variant": None,
        "source": {"code": None, "name": None, "page": None, "path": None},
        "level": {"kind": None, "value": None, "display": None},
        "identity": {"rarity": None, "traits": [], "school": None,
                     "traditions": [], "classes": [], "cantrip": False,
                     "ritual": False},
        "activity": None, "trigger": None,
        "components": {"list": [], "material": None, "cost": None,
                       "currency": None, "consumed": None},
        "range": None, "targets": None, "area": None, "duration": None,
        "save": None, "attack": None, "damage": [], "heightening": [],
        "entries": [], "systemExtras": {},
        "parse": {"status": "ok", "warnings": [], "unmapped": []},
    }


def parse_fields(text):
    return {m.group(1).strip(): m.group(2).strip() for m in FIELD_RE.finditer(text)}


def parse_activity(raw, warn):
    """'1 action' / '1 reaction, which you take when...' / 'minute' / '◆◆ (somatic, verbal)'"""
    if not raw:
        return None, None, []
    sym = None
    m = re.match(r'^\s*([' + ONE + REACT + FREE + r']+)', raw)
    comps = []
    if m:
        sym = m.group(1)
        rest = raw[m.end():].strip()
        mc = re.match(r'^\((.*?)\)', rest)
        if mc:
            comps = [COMPONENT_MAP.get(x.strip().lower())
                     for x in mc.group(1).split(',')]
            comps = [c for c in comps if c]
        if sym == REACT:
            return {"unit": "reaction", "number": 1, "symbol": sym}, None, comps
        if sym == FREE:
            return {"unit": "free", "number": 1, "symbol": sym}, None, comps
        return {"unit": "action", "number": min(sym.count(ONE), 3),
                "symbol": sym}, None, comps

    # components can trail ANY cast form, not just glyph ones:
    #   "1 minute (material, somatic, verbal)"
    mc = re.search(r'\(([^)]*)\)\s*$', raw)
    if mc:
        comps = [COMPONENT_MAP.get(x.strip().lower()) for x in mc.group(1).split(',')]
        comps = [c for c in comps if c]
        seen = set(); comps = [c for c in comps if not (c in seen or seen.add(c))]
    body_raw = re.sub(r'\s*\([^)]*\)\s*$', '', raw).strip()
    if body_raw.startswith('(') and body_raw.endswith(')'):
        body_raw = body_raw[1:-1].strip()
    if re.match(r'^no casting time', body_raw, re.I):
        warn.append("source states no casting time")
        return {"unit": None, "number": None, "symbol": None}, None, comps

    # variable-action spells: "1 to 3" / "2 or 3" — the caster picks how many
    # actions to spend and the effect scales with the choice.
    mv = re.match(r'^\s*(\d)\s*(?:to|or|-|–)\s*(\d)\s*([A-Za-z]+)?\s*$', body_raw)
    if mv:
        unit = TIME_UNITS.get((mv.group(3) or 'action').lower(), 'action')
        return ({"unit": unit, "number": int(mv.group(1)),
                 "numberMax": int(mv.group(2)), "symbol": None}, None, comps)
    mo = re.match(r'^\s*(\d)\s*or more\s*$', body_raw, re.I)
    if mo:
        warn.append("open-ended variable cast (%r)" % body_raw)
        return ({"unit": "action", "number": int(mo.group(1)),
                 "numberMax": None, "symbol": None}, None, comps)

    trigger = None
    body = body_raw
    if ',' in body_raw and re.search(r'reaction', body_raw, re.I):
        head, tail = body_raw.split(',', 1)
        body = head.strip()
        trigger = re.sub(r'^\s*which you take\s*', '', tail.strip(), flags=re.I) or None

    mnum = re.match(r'^\s*(\d+)?\s*([A-Za-z]+)', body)
    if not mnum:
        warn.append("unparsed casting time: %r" % raw[:40])
        return {"unit": None, "number": None, "symbol": None}, trigger, comps
    n = int(mnum.group(1)) if mnum.group(1) else None
    word = mnum.group(2).lower()
    if word == 'bonus':
        unit = 'bonus'
    else:
        unit = TIME_UNITS.get(word)
    if unit is None:
        warn.append("unknown casting-time unit: %r" % word)
    if n is None and unit:
        warn.append("casting time missing its number: %r" % raw[:30])
    return {"unit": unit, "number": n, "symbol": None}, trigger, comps


def parse_components_5e(raw):
    out = {"list": [], "material": None, "cost": None, "currency": None,
           "consumed": None}
    if not raw:
        return out
    mat = re.search(r'M\s*\(([^)]*)\)', raw)
    head = re.sub(r'M\s*\([^)]*\)', 'M', raw)
    for tok in re.split(r'[,\s]+', head):
        c = COMPONENT_MAP.get(tok.strip(' .').lower())
        if c and c not in out['list']:
            out['list'].append(c)
    if mat:
        txt = mat.group(1).strip()
        out['material'] = txt
        mc = re.search(r'([\d,]+)\s*(gp|sp|cp|pp)\b', txt, re.I)
        if mc:
            out['cost'] = num(mc.group(1))
            out['currency'] = mc.group(2).lower()
        out['consumed'] = bool(re.search(r'consume', txt, re.I))
    return out


def parse_range(raw):
    if not raw:
        return None
    m = re.search(r'(\d+)\s*(feet|foot|ft\.?|miles?|mi\.?)', raw, re.I)
    if m:
        u = m.group(2).lower()
        return {"text": raw, "value": int(m.group(1)),
                "unit": 'mi' if u.startswith('mi') else 'ft'}
    return {"text": raw, "value": None, "unit": None}


def parse_area(raw):
    if not raw:
        return None
    m = re.search(r'(\d+)[-\s]*(?:foot|feet|ft\.?)[-\s]*(emanation|burst|cone|line|'
                  r'radius|sphere|cube|cylinder|square)', raw, re.I)
    if m:
        return {"shape": m.group(2).lower(), "size": int(m.group(1)),
                "unit": "ft", "text": raw}
    return {"shape": None, "size": None, "unit": None, "text": raw}


def parse_duration(raw):
    if not raw:
        return None
    conc = bool(re.search(r'concentration', raw, re.I))
    sust = bool(re.search(r'sustained', raw, re.I))
    m = re.search(r'(\d+)\s*(round|minute|hour|day|week|month|year)', raw, re.I)
    return {"text": raw, "value": int(m.group(1)) if m else None,
            "unit": m.group(2).lower() if m else None,
            "concentration": conc, "sustained": sust}


def parse_heightening(text, system):
    out = []
    if system == 'pf2e':
        for m in re.finditer(r'\*\*Heightened\s*\(([^)]*)\)\*\*[ \t]*(.*)', text):
            spec, body = m.group(1).strip(), clean_links(m.group(2).strip())
            mi = re.match(r'^\+\s*(\d+)$', spec)
            if mi:
                out.append({"kind": "increment", "step": int(mi.group(1)),
                            "atRank": None, "text": body})
            else:
                mf = re.match(r'^(\d+)', spec)
                out.append({"kind": "fixed", "step": None,
                            "atRank": int(mf.group(1)) if mf else None,
                            "text": body})
    else:
        for m in re.finditer(
                r'\*\*(?:Using a Higher-Level Spell Slot|At Higher Levels)[.:]?\*\*[ \t]*(.*)',
                text):
            out.append({"kind": "slot", "step": None, "atRank": None,
                        "text": m.group(1).strip()})
    return out


def parse_degrees(text):
    degs = {}
    empty = False
    for line in text.split('\n'):
        m = DEG_RE.match(line.strip())
        if m:
            v = clean_links(m.group(2).strip())
            if v:
                degs[DEG_KEY[m.group(1).lower()]] = v
            else:
                empty = True
    return degs, empty


def body_entries(text, system):
    """Prose paragraphs: drop headings, bullets, separators, the trait line,
    degree lines and heightening lines (all captured structurally elsewhere)."""
    out = []
    for raw in text.split('\n'):
        s = raw.strip()
        if not s or s.startswith(('#', '-', '---')):
            continue
        if s.startswith('*') and s.endswith('*') and len(s) < 90 and ':' not in s:
            continue
        if DEG_RE.match(s):
            continue
        if re.match(r'^\*\*(Heightened|Using a Higher-Level Spell Slot|At Higher Levels)', s):
            continue
        out.append(clean_links(s) if system == 'pf2e' else s)
    return out


def parse_5e(text, rec, warn):
    f = parse_fields(text)
    rec['systemExtras']['fields'] = sorted(f)

    lvl = f.get('Level', '')
    m = re.match(r'^(\S+)\s*(.*)$', lvl)
    if m:
        head, school = m.group(1), m.group(2).strip()
        if head.lower() in ('cantrip', '0'):
            rec['level'] = {"kind": "level", "value": 0, "display": head}
            rec['identity']['cantrip'] = True
        else:
            rec['level'] = {"kind": "level", "value": num(head),
                            "display": head}
        if school:
            key = school.lower()
            if key in SCHOOLS:
                rec['identity']['school'] = SCHOOLS[key]
            else:
                rec['identity']['school'] = school.title()
                warn.append("unrecognised school %r (kept as written)" % school)
    else:
        warn.append("unparsed Level: %r" % lvl)

    cls = f.get('Classes', '')
    if cls:
        rec['identity']['classes'] = [c.strip() for c in cls.split(',') if c.strip()]
    elif 'Classes' in f:
        warn.append("Classes field present but empty in source")

    act, trig, _ = parse_activity(f.get('Casting Time', ''), warn)
    rec['activity'] = act
    rec['trigger'] = trig

    if 'Components' in f and not f['Components']:
        warn.append("Components field present but empty in source")
    rec['components'] = parse_components_5e(f.get('Components', ''))

    if 'Range' in f and not f['Range']:
        warn.append("Range field present but empty in source")
    rec['range'] = parse_range(f.get('Range', ''))

    if 'Duration' in f and not f['Duration']:
        warn.append("Duration field present but empty in source")
    rec['duration'] = parse_duration(f.get('Duration', ''))

    src = f.get('Source', '')
    if src:
        rec['source']['name'] = src
        p = re.search(r'p\.?\s*(\d+)', src, re.I)
        if p: rec['source']['page'] = int(p.group(1))

    rec['identity']['ritual'] = bool(re.search(r'\britual\b', text, re.I))

    body = ' '.join(body_entries(text, 'dnd5e'))
    ms = re.search(r'(?:make|makes|must succeed on)\s+an?\s+([A-Za-z]+)\s+saving throw', body, re.I)
    if ms:
        _d = ms.group(1).lower()
        _ab = {'strength':'str','dexterity':'dex','constitution':'con',
               'intelligence':'int','wisdom':'wis','charisma':'cha'}
        rec['save'] = {"defense": _ab.get(_d, _d[:12]), "dc": None,
                       "basic": False, "outcomes": {}}
        if re.search(r'half as much|half the damage|half damage', body, re.I):
            rec['save']['outcomes'] = {"success": "half", "failure": "full"}
        else:
            rec['save']['outcomes'] = {"success": "none", "failure": "full"}
    elif re.search(r'\b(ranged|melee)\s+spell attack\b', body, re.I):
        mk = re.search(r'\b(ranged|melee)\s+spell attack\b', body, re.I)
        rec['attack'] = {"kind": "spell", "vs": mk.group(1).lower()}

    for avg, formula, dtype in re.findall(
            r'(\d+)\s*\((\d+d\d+(?:\s*[+-]\s*\d+)?)\)\s*([A-Za-z]+)\s*damage', body, re.I):
        rec['damage'].append({"formula": re.sub(r'\s+', '', formula),
                              "average": int(avg), "type": dtype.lower()})
    if not rec['damage']:
        for formula, dtype in re.findall(
                r'(\d+d\d+(?:\s*[+-]\s*\d+)?)\s*([A-Za-z]+)\s*damage', body, re.I):
            rec['damage'].append({"formula": re.sub(r'\s+', '', formula),
                                  "average": None, "type": dtype.lower()})

    marea = re.search(r'(\d+)[-\s]*(?:foot|feet|ft\.?)[-\s]*(?:radius\s*)?'
                      r'(sphere|cone|line|cube|cylinder|square|radius|emanation)',
                      body, re.I)
    if marea:
        sh = marea.group(2).lower()
        rec['area'] = {"shape": 'sphere' if sh == 'radius' else sh,
                       "size": int(marea.group(1)), "unit": "ft",
                       "text": marea.group(0)}

    rec['heightening'] = parse_heightening(text, 'dnd5e')
    rec['entries'] = body_entries(text, 'dnd5e')
    return rec


def parse_pf2e(text, rec, warn):
    f = parse_fields(text)
    rec['systemExtras']['fields'] = sorted(f)

    # trait line: first italic-only line under the title
    for line in text.split('\n')[1:6]:
        s = line.strip()
        if s.startswith('*') and s.endswith('*') and len(s) > 2 and not s.startswith('**'):
            traits = [t.strip().lower() for t in s.strip('*').split(',') if t.strip()]
            rec['identity']['traits'] = traits
            for t in traits:
                if t in RARITIES: rec['identity']['rarity'] = t
            if not rec['identity']['rarity'] and traits:
                rec['identity']['rarity'] = 'common'
            rec['identity']['cantrip'] = 'cantrip' in traits
            rec['identity']['ritual'] = 'ritual' in traits
            break

    lvl = f.get('Level', '')
    m = re.match(r'^(Spell|Focus|Cantrip|Ritual)\s*(\d+)?', lvl, re.I)
    if m:
        word = m.group(1).lower()
        rec['level'] = {"kind": "focus" if word == 'focus' else "rank",
                        "value": int(m.group(2)) if m.group(2) else None,
                        "display": lvl}
    else:
        warn.append("unparsed Level: %r" % lvl)
        rec['level'] = {"kind": "rank", "value": None, "display": lvl or None}

    tr = f.get('Traditions', '')
    if tr:
        rec['identity']['traditions'] = [x.strip().lower() for x in tr.split(',')
                                         if x.strip().lower() in TRADITIONS]

    act, trig, comps = parse_activity(f.get('Cast', ''), warn)
    rec['activity'] = act
    rec['trigger'] = trig or (f.get('Trigger') or None)
    if comps: rec['components']['list'] = comps

    rec['range'] = parse_range(f.get('Range', ''))
    rec['targets'] = f.get('Targets') or None
    rec['area'] = parse_area(f.get('Area', ''))
    rec['duration'] = parse_duration(f.get('Duration', ''))

    src = f.get('Source', '')
    if src:
        rec['source']['name'] = src
        p = re.search(r'p\.?\s*(\d+)', src, re.I)
        if p: rec['source']['page'] = int(p.group(1))

    st = (f.get('Saving Throw') or '').strip().lower()
    if st:
        if st == 'ac' or st.startswith('ac '):
            # not a save at all — this is a spell attack roll
            rec['attack'] = {"kind": "spell", "vs": "ac"}
        else:
            basic = st.startswith('basic')
            defense = st.replace('basic', '').strip() or None
            rec['save'] = {"defense": defense, "dc": None, "basic": basic,
                           "outcomes": {}}

    degs, empty = parse_degrees(text)
    if degs:
        if rec['save'] is None:
            rec['save'] = {"defense": None, "dc": None, "basic": False, "outcomes": {}}
        rec['save']['outcomes'] = {k: degs[k] for k in DEG_ORDER if degs.get(k)}
    elif empty:
        warn.append("degree-of-success labels present but empty in source")
    if rec['save'] and rec['save']['basic'] and not rec['save']['outcomes']:
        rec['save']['outcomes'] = {"criticalSuccess": "none", "success": "half",
                                   "failure": "full", "criticalFailure": "double"}

    body = ' '.join(body_entries(text, 'pf2e'))
    for formula, dtype in re.findall(
            r'(\d+d\d+(?:\s*[+-]\s*\d+)?)\s+([a-z]+)\s+damage', body, re.I):
        rec['damage'].append({"formula": re.sub(r'\s+', '', formula),
                              "average": None, "type": dtype.lower()})

    rec['heightening'] = parse_heightening(text, 'pf2e')
    rec['entries'] = body_entries(text, 'pf2e')
    return rec


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
    text = open(path, encoding='utf-8', errors='replace').read().replace('\r', '')
    variant = VAR5E[folder] if system == '5e' else folder
    rec['gameSystem'] = 'dnd5e' if system == '5e' else 'pf2e'
    rec['variant'] = variant
    rec['source']['code'] = folder
    rec['source']['path'] = rel
    m = re.search(r'(?m)^#\s+(.+?)\s*$', text)
    if m: rec['name'] = m.group(1).strip()

    try:
        if system == 'pf2e':
            parse_pf2e(text, rec, warn)
        else:
            parse_5e(text, rec, warn)
    except Exception as e:
        warn.append("parser exception: %s: %s" % (type(e).__name__, e))
        rec['parse']['status'] = 'failed'

    if not rec['name']:
        rec['name'] = stem.replace('-', ' ').title()
        warn.append("no title heading; derived from filename")
    idstem = stem
    sfx = SFX.get(folder)
    if sfx and idstem.endswith(sfx): idstem = idstem[:-len(sfx)]
    rec['id'] = "%s:%s:%s" % (rec['gameSystem'], kebab(variant), kebab(idstem))

    if not rec['entries']:
        warn.append("no description text in source")
    if rec['level']['value'] is None and rec['level']['kind'] != 'focus':
        warn.append("no spell level/rank parsed")

    if rec['parse']['status'] != 'failed':
        rec['parse']['status'] = 'partial' if warn else 'ok'
    rec['parse']['warnings'] = warn
    return clean_record(rec)


def main():
    root = os.path.dirname(os.path.abspath(__file__))
    base = os.path.join(root, 'spells')
    stats = collections.Counter(); warns = collections.Counter()
    for system in ('5e', 'pf2e'):
        sdir = os.path.join(base, system)
        if not os.path.isdir(sdir): continue
        for folder in sorted(os.listdir(sdir)):
            fdir = os.path.join(sdir, folder)
            if not os.path.isdir(fdir) or folder.startswith("_"): continue
            for fn in sorted(os.listdir(fdir)):
                if not fn.endswith('.md'): continue
                stem = fn[:-3]
                rel = "spells/%s/%s/%s" % (system, folder, fn)
                rec = convert_file(os.path.join(fdir, fn), system, folder, stem, rel)
                with open(os.path.join(fdir, out_name(system, folder, stem)),
                          'w', encoding='utf-8') as fh:
                    json.dump(rec, fh, indent=2, ensure_ascii=False)
                stats[rec['parse']['status']] += 1; stats['total'] += 1
                for w in rec['parse']['warnings']:
                    warns[w.split(':')[0].strip()[:55]] += 1
    print(json.dumps({"stats": dict(stats), "warnings": warns.most_common(15)}, indent=1))


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Validate the four shipped JSON bundles against monster/spell JSON Schemas.

CI gate companion to build_bundles.py --check. Validates every record in:
  monsters-5e.json, monsters-pf2e.json, spells-5e.json, spells-pf2e.json
"""
from __future__ import annotations

import json
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
MAX_ERRORS = 25

BUNDLES = [
    ("monsters-5e.json", "monster"),
    ("monsters-pf2e.json", "monster"),
    ("spells-5e.json", "spell"),
    ("spells-pf2e.json", "spell"),
]


def main() -> int:
    try:
        from jsonschema import Draft202012Validator
    except ImportError:
        print("jsonschema is required: pip install 'jsonschema==4.23.0'", file=sys.stderr)
        return 2

    schemas = {
        "monster": Draft202012Validator(
            json.load(open(os.path.join(ROOT, "monster.schema.json"), encoding="utf-8"))
        ),
        "spell": Draft202012Validator(
            json.load(open(os.path.join(ROOT, "spell.schema.json"), encoding="utf-8"))
        ),
    }

    errors = 0
    seen_ids: dict[str, str] = {}
    for fname, kind in BUNDLES:
        path = os.path.join(ROOT, fname)
        if not os.path.isfile(path):
            print("missing bundle: %s" % fname, file=sys.stderr)
            return 1
        with open(path, encoding="utf-8") as fh:
            records = json.load(fh)
        if not isinstance(records, list):
            print("%s: expected a JSON array" % fname, file=sys.stderr)
            return 1
        validator = schemas[kind]
        for i, rec in enumerate(records):
            rid = rec.get("id") if isinstance(rec, dict) else None
            if isinstance(rid, str) and rid:
                prev = seen_ids.get(rid)
                if prev is not None:
                    errors += 1
                    print(
                        "duplicate id across bundles: %r in %s and %s"
                        % (rid, prev, fname),
                        file=sys.stderr,
                    )
                    if errors >= MAX_ERRORS:
                        print(
                            "… stopping after %d errors (more may exist)" % MAX_ERRORS,
                            file=sys.stderr,
                        )
                        return 1
                else:
                    seen_ids[rid] = fname
            for err in validator.iter_errors(rec):
                errors += 1
                loc = "/".join(str(p) for p in err.absolute_path) or "(root)"
                print(
                    "%s[%s] id=%s @ %s: %s"
                    % (fname, i, rid, loc, err.message),
                    file=sys.stderr,
                )
                if errors >= MAX_ERRORS:
                    print(
                        "… stopping after %d errors (more may exist)" % MAX_ERRORS,
                        file=sys.stderr,
                    )
                    return 1
        print("%s  %d records  ok" % (fname, len(records)))

    if errors:
        return 1
    print("All bundle records validate against the published schemas.")
    print("Global record ids unique across %d bundles (%d ids)." % (len(BUNDLES), len(seen_ids)))
    return 0


if __name__ == "__main__":
    sys.exit(main())

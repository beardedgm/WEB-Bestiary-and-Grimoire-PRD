#!/usr/bin/env python3
"""Rebuild the four JSON bundles and index.html from the sidecars.

The sidecar .json files next to each markdown source are the input; everything
this script writes is a build artifact:

    monsters/**/*.json ─┐
    spells/**/*.json  ──┴─▶ monsters-{5e,pf2e}.json, spells-{5e,pf2e}.json
                                        │
                                        └─▶ index.html
                                            (app.template.html + gzipped bundles)

Edit app.template.html, never index.html — the latter is overwritten on build.

Run the converters first if the markdown changed:

    python convert_monsters.py
    python convert_spells.py
    python build_bundles.py

Usage:
    python build_bundles.py            rebuild everything
    python build_bundles.py --check    verify only; exit 1 if anything is stale
    python build_bundles.py --no-page  bundles only
"""

import argparse
import base64
import gzip
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))

# (source tree, system, bundle filename) — bundles are grouped by kind and system
BUNDLES = [
    ("monsters", "5e",   "monsters-5e.json"),
    ("monsters", "pf2e", "monsters-pf2e.json"),
    ("spells",   "5e",   "spells-5e.json"),
    ("spells",   "pf2e", "spells-pf2e.json"),
]

SYSTEM_ID = {"5e": "dnd5e", "pf2e": "pf2e"}

# app.template.html holds the markup, CSS and JS with no data in it — that's the
# file you edit. index.html is it with the four bundles baked in: open that one.
TEMPLATE = "app.template.html"
PAGE = "index.html"

# Order the page embeds bundles in — matches FILES in the template so the
# in-page log reads the same either way.
EMBED_ORDER = ["spells-5e.json", "spells-pf2e.json",
               "monsters-5e.json", "monsters-pf2e.json"]

EM = "—"
ELLIPSIS = "…"

# Loader injected into the standalone: unpack the inline gzip payloads instead of
# fetching. Falls through to the template's fetch path if the browser is too old.
LOADER_JS = r"""async function gunzipB64(b64){
  const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const stream = new Blob([bin]).stream().pipeThrough(new DecompressionStream("gzip"));
  return await new Response(stream).text();
}
async function tryEmbedded(){
  const nodes = [...document.querySelectorAll("script[data-bundle]")];
  if (!nodes.length) return 0;
  if (typeof DecompressionStream === "undefined"){
    logline("this browser has no DecompressionStream @@EM@@ falling back"); return 0;
  }
  DATA.length = 0;
  let ok = 0;
  for (const n of nodes){
    try{
      const arr = JSON.parse(await gunzipB64(n.textContent.trim()));
      ingest(n.dataset.bundle, arr); ok++;
      logline("\u2713 " + n.dataset.bundle + "  (" + arr.length.toLocaleString() + " records)");
    }catch(e){ logline("\u2717 " + n.dataset.bundle + " @@EM@@ " + e.message); }
    n.remove();                       // release the base64 text
  }
  return ok;
}
""".replace("@@EM@@", EM)

BUNDLE_TAG_RE = re.compile(
    r'<script[^>]*data-bundle="([^"]+)"[^>]*>(.*?)</script>\n?', re.S)


# --------------------------------------------------------------------------- #
# bundles
# --------------------------------------------------------------------------- #

def iter_sidecars(kind, system):
    """Yield sidecar paths under <kind>/<system>/<book>/.

    Directories whose name starts with '_' are scratch space, not source books,
    and are skipped.
    """
    base = os.path.join(ROOT, kind, system)
    if not os.path.isdir(base):
        raise SystemExit("missing source tree: %s" % base)
    for book in sorted(os.listdir(base)):
        bdir = os.path.join(base, book)
        if not os.path.isdir(bdir) or book.startswith("_"):
            continue
        for fn in sorted(os.listdir(bdir)):
            if fn.endswith(".json"):
                yield os.path.join(bdir, fn)


def build_bundle(kind, system):
    """Collect sidecars into one sorted, minified bundle. Returns (bytes, records)."""
    records, seen = [], {}
    for path in iter_sidecars(kind, system):
        with open(path, encoding="utf-8") as fh:
            rec = json.load(fh)
        rid = rec.get("id")
        if not rid:
            raise SystemExit("record without an id: %s" % path)
        if rid in seen:
            raise SystemExit("duplicate id %s\n  %s\n  %s" % (rid, seen[rid], path))
        want = SYSTEM_ID[system]
        if rec.get("gameSystem") != want:
            raise SystemExit("%s: gameSystem is %r, expected %r"
                             % (path, rec.get("gameSystem"), want))
        seen[rid] = path
        records.append(rec)

    records.sort(key=lambda r: r["id"])
    # Minified, UTF-8, no trailing newline — sorting by id keeps diffs meaningful.
    blob = json.dumps(records, separators=(",", ":"), ensure_ascii=False)
    return blob.encode("utf-8"), records


# --------------------------------------------------------------------------- #
# standalone browser
# --------------------------------------------------------------------------- #

def _sub_once(text, old, new, label):
    if text.count(old) != 1:
        raise SystemExit("%s: expected exactly one %r in %s (found %d) "
                         "— the template changed, update build_bundles.py"
                         % (label, old[:60], TEMPLATE, text.count(old)))
    return text.replace(old, new)


def build_page(bundle_bytes, total_records):
    """template + inline gzipped bundles = one self-contained page."""
    with open(os.path.join(ROOT, TEMPLATE), encoding="utf-8", newline="") as fh:
        html = fh.read()

    html = _sub_once(html,
                     '<p id="lmsg">Loading data files%s</p>' % ELLIPSIS,
                     '<p id="lmsg">Unpacking {:,} records{}</p>'.format(
                         total_records, ELLIPSIS),
                     "loading message")

    tags = "".join(
        '<script data-bundle="%s" type="text/plain">%s</script>\n'
        % (name, base64.b64encode(
            # mtime=0 so rebuilding identical input gives an identical file
            gzip.compress(bundle_bytes[name], compresslevel=9, mtime=0)
        ).decode("ascii"))
        for name in EMBED_ORDER
    )
    html = _sub_once(html,
                     '<div id="dpop" hidden></div>\n\n<script>\n"use strict";',
                     '<div id="dpop" hidden></div>\n\n%s<script>\n"use strict";' % tags,
                     "bundle insertion point")

    html = _sub_once(html,
                     "async function boot(){\n",
                     LOADER_JS + "async function boot(){\n"
                     "  if ((await tryEmbedded()) === FILES.length) { start(); return; }\n",
                     "boot()")
    return html


def split_page(html):
    """Split the built page into (skeleton, {bundle name: decoded records}).

    Compares by content rather than bytes, so a rebuild from unchanged data
    still matches even if the committed file was gzipped with a real mtime.
    """
    payloads = {}
    for m in BUNDLE_TAG_RE.finditer(html):
        payloads[m.group(1)] = json.loads(
            gzip.decompress(base64.b64decode(m.group(2).strip())).decode("utf-8"))
    return BUNDLE_TAG_RE.sub("<<BUNDLE>>", html), payloads


# --------------------------------------------------------------------------- #

def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true",
                    help="verify the committed artifacts are current; write nothing")
    ap.add_argument("--no-page", action="store_true",
                    help="rebuild the bundles only; leave index.html alone")
    args = ap.parse_args()

    stale = []
    bundle_bytes, total = {}, 0

    for kind, system, name in BUNDLES:
        blob, records = build_bundle(kind, system)
        bundle_bytes[name] = blob
        total += len(records)
        dst = os.path.join(ROOT, name)
        current = open(dst, "rb").read() if os.path.exists(dst) else None

        if args.check:
            state = "ok" if current == blob else "STALE"
            if current != blob:
                stale.append(name)
        else:
            if current == blob:
                state = "unchanged"
            else:
                with open(dst, "wb") as fh:
                    fh.write(blob)
                state = "written"
        print("%-22s %5d records  %7.1f MB  %s"
              % (name, len(records), len(blob) / 1e6, state))

    if not args.no_page:
        html = build_page(bundle_bytes, total)
        dst = os.path.join(ROOT, PAGE)
        state = "written"
        if os.path.exists(dst):
            with open(dst, encoding="utf-8", newline="") as fh:
                current = fh.read()
            new_skel, new_data = split_page(html)
            old_skel, old_data = split_page(current)
            if (new_skel, new_data) == (old_skel, old_data):
                state = "ok" if args.check else "unchanged"
            elif args.check:
                state = "STALE"
                stale.append(PAGE)
        if not args.check and state != "unchanged":
            with open(dst, "w", encoding="utf-8", newline="") as fh:
                fh.write(html)
        print("%-22s %5d records  %7.1f MB  %s"
              % (PAGE, total, len(html.encode("utf-8")) / 1e6, state))

    if args.check and stale:
        print("\nstale: %s\nrun: python build_bundles.py" % ", ".join(stale),
              file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

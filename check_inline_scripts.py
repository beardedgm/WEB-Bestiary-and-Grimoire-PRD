#!/usr/bin/env python3
"""Extract inline <script> blocks from app.template.html and syntax-check with node.

CI companion: catches JS parse errors that Python gates miss. Requires `node` on PATH.
"""
from __future__ import annotations

import os
import re
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.abspath(__file__))
TEMPLATE = os.path.join(ROOT, "app.template.html")
SCRIPT_RE = re.compile(r"<script\b[^>]*>(.*?)</script>", re.I | re.S)


def main() -> int:
    if not os.path.isfile(TEMPLATE):
        print("missing app.template.html", file=sys.stderr)
        return 1
    try:
        subprocess.run(["node", "--version"], check=True, capture_output=True)
    except (OSError, subprocess.CalledProcessError):
        print("node is required on PATH for check_inline_scripts.py", file=sys.stderr)
        return 2

    html = open(TEMPLATE, encoding="utf-8").read()
    blocks = SCRIPT_RE.findall(html)
    if not blocks:
        print("no inline <script> blocks found", file=sys.stderr)
        return 1

    failed = 0
    with tempfile.TemporaryDirectory(prefix="bg-js-") as tmp:
        for i, body in enumerate(blocks, 1):
            src = body.strip()
            if not src:
                continue
            path = os.path.join(tmp, "script-%d.js" % i)
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(src)
                fh.write("\n")
            proc = subprocess.run(
                ["node", "--check", path],
                capture_output=True,
                text=True,
            )
            if proc.returncode != 0:
                failed += 1
                print("script #%d failed node --check:" % i, file=sys.stderr)
                err = (proc.stderr or proc.stdout or "").strip()
                if err:
                    print(err, file=sys.stderr)

    if failed:
        print("%d inline script(s) failed syntax check" % failed, file=sys.stderr)
        return 1
    print("Inline scripts OK (%d non-empty block(s) checked)." % sum(1 for b in blocks if b.strip()))
    return 0


if __name__ == "__main__":
    sys.exit(main())

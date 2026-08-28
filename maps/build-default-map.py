#!/usr/bin/env python3
"""Generate maps/starter.hexplora — bundled default hex-crawl map (run when art changes)."""
from __future__ import annotations

import base64
import json
import math
import struct
import zlib
from pathlib import Path

W, H = 1280, 960
OUT = Path(__file__).resolve().parent / "starter.hexplora"


def _png_chunk(tag: bytes, data: bytes) -> bytes:
    crc = zlib.crc32(tag + data) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)


def write_png(path: Path, width: int, height: int, pixels: list[tuple[int, int, int]]) -> None:
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        start = y * width
        raw.extend(bytes(c for i in range(start, start + width) for c in pixels[i]))
    compressed = zlib.compress(bytes(raw), 9)
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + _png_chunk(b"IHDR", ihdr) + _png_chunk(b"IDAT", compressed) + _png_chunk(b"IEND", b"")
    path.write_bytes(png)


def _noise(x: float, y: float) -> float:
    return (
        math.sin(x * 0.011 + y * 0.017) * 0.5
        + math.sin(x * 0.023 - y * 0.019) * 0.3
        + math.sin((x + y) * 0.008) * 0.2
    )


def _dist(ax: float, ay: float, bx: float, by: float) -> float:
    return math.hypot(ax - bx, ay - by)


def _in_ellipse(px: float, py: float, cx: float, cy: float, rx: float, ry: float) -> bool:
    dx, dy = (px - cx) / rx, (py - cy) / ry
    return dx * dx + dy * dy <= 1.0


def _seg_dist(x: float, y: float, ax: float, ay: float, bx: float, by: float) -> float:
    seg = max(_dist(ax, ay, bx, by), 1.0)
    t = max(0, min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / (seg * seg)))
    px, py = ax + t * (bx - ax), ay + t * (by - ay)
    return _dist(x, y, px, py)


def render_pixels() -> list[tuple[int, int, int]]:
    pixels: list[tuple[int, int, int]] = []
    river = [(180, 720), (340, 640), (520, 560), (700, 500), (900, 420), (1080, 340)]
    trail = [(220, 260), (420, 320), (620, 380), (820, 420), (1020, 460)]
    for y in range(H):
        for x in range(W):
            n = _noise(x, y)
            r = int(218 + n * 18)
            g = int(200 + n * 14)
            b = int(168 + n * 10)
            if _in_ellipse(x, y, 280, 260, 240, 200):
                r, g, b = int(34 + n * 8), int(72 + n * 10), int(42 + n * 6)
            elif _in_ellipse(x, y, 980, 220, 220, 170):
                r, g, b = int(96 + n * 12), int(108 + n * 10), int(88 + n * 8)
            elif _in_ellipse(x, y, 360, 760, 300, 180):
                r, g, b = int(28 + n * 6), int(64 + n * 8), int(38 + n * 5)
            elif _in_ellipse(x, y, 920, 780, 260, 160):
                r, g, b = int(32 + n * 7), int(70 + n * 9), int(40 + n * 5)
            elif _in_ellipse(x, y, 640, 480, 360, 280):
                r, g, b = int(196 + n * 16), int(178 + n * 14), int(132 + n * 10)
            else:
                on_river = any(_seg_dist(x, y, river[i][0], river[i][1], river[i + 1][0], river[i + 1][1]) < 22
                               for i in range(len(river) - 1))
                if on_river:
                    r, g, b = 52, 98, 128
                else:
                    on_trail = any(_seg_dist(x, y, trail[i][0], trail[i][1], trail[i + 1][0], trail[i + 1][1]) < 14
                                   for i in range(len(trail) - 1))
                    if on_trail:
                        r, g, b = 154, 132, 96
            edge = max(0.0, min(1.0, min(x, y, W - 1 - x, H - 1 - y) / 120.0))
            r = int(r * (0.72 + 0.28 * edge))
            g = int(g * (0.72 + 0.28 * edge))
            b = int(b * (0.72 + 0.28 * edge))
            pixels.append((max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b))))
    return pixels


def starter_state() -> dict:
    revealed = {f"{col}-{row}": True for col in range(8, 13) for row in range(5, 10)}
    return {
        "settings": {
            "hexSize": 40,
            "offsetX": 80,
            "offsetY": 48,
            "columnCount": 20,
            "rowCount": 15,
            "orientation": "pointy",
            "mapScale": 100,
            "fogColor": "#1a3d24",
            "fogOpacity": 0.88,
            "gridColor": "#f4f0e8",
            "gridThickness": 1.25,
            "tokenColor": "#8b3a2a",
            "tokenIcon": "⌂",
            "tokenSize": "medium",
            "hexDistanceValue": 6,
            "hexDistanceUnit": "miles",
        },
        "view": {"zoomLevel": 1, "panX": 0, "panY": 0},
        "revealedHexes": revealed,
        "tokens": [{
            "x": 807.5,
            "y": 468.0,
            "label": "Camp",
            "icon": "⌂",
            "color": "#8b3a2a",
            "notes": "Party start — reveal hexes and place tokens from here.",
            "zIndex": 1,
        }],
        "strokes": [],
        "shapes": [],
        "texts": [],
        "measurements": [],
    }


def main() -> None:
    png_path = OUT.with_suffix(".png")
    write_png(png_path, W, H, render_pixels())
    data_url = "data:image/png;base64," + base64.standard_b64encode(png_path.read_bytes()).decode("ascii")
    payload = {
        "name": "Starter map",
        "mapData": data_url,
        "mapImageData": data_url,
        "state": starter_state(),
        "version": "1.0",
        "exportedAt": "2026-08-27T00:00:00.000Z",
        "description": "Bundled Bestiary & Grimoire hex-crawl starter — meadow, woods, river, and trail.",
    }
    OUT.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {OUT} ({OUT.stat().st_size // 1024} KB) and {png_path} ({png_path.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()

/**
 * Copy Material Symbols (outlined, w400) into maps/token-icons/ for map tokens.
 * Source: @material-symbols/svg-400 (Apache-2.0, derived from Google Material Symbols).
 * Each icon is normalized to a 24×24 viewBox so visual size is consistent on token discs.
 * Run from maps/: npm run build:icons
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { svgPathBbox } from "svg-path-bbox";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(__dirname, "node_modules", "@material-symbols", "svg-400", "outlined");
const OUT_DIR = join(__dirname, "token-icons");
const OUT_SIZE = 24;
const PAD = 1.5;

/** token slug → Material Symbols icon file stem (without .svg) */
const ICON_MAP = {
  star: "star",
  home: "home",
  skull: "skull",
  sword: "swords",
  shield: "shield",
  flag: "flag",
  person: "person",
  group: "group",
  castle: "castle",
  village: "cottage",
  bolt: "bolt",
  location: "location_on",
  check: "check",
  question: "help",
  exclamation: "warning",
  grass: "grass",
  fort: "fort",
  camp: "camping",
};

function extractPathDs(svg) {
  const ds = [];
  const re = /<path\b[^>]*\bd="([^"]+)"/g;
  let m;
  while ((m = re.exec(svg))) ds.push(m[1]);
  return ds;
}

function unionBbox(pathDs) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const d of pathDs) {
    const [x0, y0, x1, y1] = svgPathBbox(d);
    minX = Math.min(minX, x0);
    minY = Math.min(minY, y0);
    maxX = Math.max(maxX, x1);
    maxY = Math.max(maxY, y1);
  }
  return { minX, minY, maxX, maxY };
}

function toTokenSvg(raw) {
  const pathDs = extractPathDs(raw);
  if (!pathDs.length) throw new Error("no paths in SVG");
  const { minX, minY, maxX, maxY } = unionBbox(pathDs);
  const bw = maxX - minX;
  const bh = maxY - minY;
  if (!(bw > 0 && bh > 0)) throw new Error("empty path bbox");
  const inner = OUT_SIZE - PAD * 2;
  const scale = inner / Math.max(bw, bh);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const transform = `translate(${OUT_SIZE / 2},${OUT_SIZE / 2}) scale(${scale}) translate(${-cx},${-cy})`;
  const paths = pathDs.map((d) => `<path fill="#ffffff" d="${d}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${OUT_SIZE} ${OUT_SIZE}"><g transform="${transform}">${paths}</g></svg>\n`;
}

let ok = 0;
for (const [slug, stem] of Object.entries(ICON_MAP)) {
  const srcPath = join(SRC_DIR, `${stem}.svg`);
  let raw;
  try {
    raw = readFileSync(srcPath, "utf8");
  } catch {
    console.error(`Missing source icon: ${srcPath}`);
    process.exitCode = 1;
    continue;
  }
  try {
    writeFileSync(join(OUT_DIR, `${slug}.svg`), toTokenSvg(raw));
    ok++;
  } catch (err) {
    console.error(`${slug}: ${err.message}`);
    process.exitCode = 1;
  }
}
console.log(`Wrote ${ok} token icons to ${OUT_DIR}`);

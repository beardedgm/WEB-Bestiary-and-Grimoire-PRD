import * as esbuild from "esbuild";
import { writeFileSync } from "fs";

writeFileSync(
  "pixi-entry.mjs",
  "import * as PIXI from 'pixi.js';\n" +
    "const g = typeof globalThis !== 'undefined' ? globalThis : window;\n" +
    "g.PIXI = PIXI;\n"
);

esbuild.buildSync({
  entryPoints: ["pixi-entry.mjs"],
  bundle: true,
  format: "iife",
  outfile: "maps-pixi.bundle.js",
  minify: true,
  target: ["es2020"],
});

console.log("Wrote maps/maps-pixi.bundle.js");

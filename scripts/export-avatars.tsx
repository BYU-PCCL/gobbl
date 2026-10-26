/**
 * Exports the turkey stages and shop items — inline SVG React components on the
 * web — as static .svg files inside the iOS asset catalog, so the native app
 * draws the exact same art without a runtime SVG library.
 *
 *   npm run export:avatars
 *
 * Output: mobile/ios/Gobbl/Resources/Assets.xcassets/Avatars/<name>.imageset/
 * The files are committed, so the Mac never needs Node to build the app.
 *
 * Skipped on purpose: the three backgrounds that use <defs> (gradients /
 * patterns), which Xcode's SVG importer handles poorly. They are drawn
 * natively in SwiftUI (see mobile/ios/.../Avatar/BackgroundView.swift):
 * sunset, cosmic, dots.
 */
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FlatTurkey } from "../src/components/gamification/FlatTurkey";
import { ITEM_RENDERERS } from "../src/components/gamification/ItemLayers";
import { SHOP_CATALOG } from "../src/lib/shop";

const OUT = join(__dirname, "..", "mobile", "ios", "Gobbl", "Resources", "Assets.xcassets", "Avatars");
const NATIVE_BACKGROUNDS = new Set(["sunset", "cosmic", "dots"]);
const UNSUPPORTED = /<(defs|filter|mask|pattern|clipPath|style|foreignObject)\b|filter=|url\(#/;

function clean(svg: string): string {
  return svg
    .replace(/\s(class|className|aria-[a-z-]+|role|style)="[^"]*"/g, "")
    .replace(/<svg(?![^>]*xmlns=)/, '<svg xmlns="http://www.w3.org/2000/svg"');
}

function writeImageset(name: string, svg: string) {
  if (UNSUPPORTED.test(svg)) {
    throw new Error(`${name}: uses an SVG feature Xcode can't import (${svg.match(UNSUPPORTED)?.[0]}). Draw it natively instead.`);
  }
  const dir = join(OUT, `${name}.imageset`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${name}.svg`), svg + "\n");
  writeFileSync(
    join(dir, "Contents.json"),
    JSON.stringify(
      {
        images: [{ filename: `${name}.svg`, idiom: "universal" }],
        info: { author: "xcode", version: 1 },
        properties: { "preserves-vector-representation": true },
      },
      null,
      2
    ) + "\n"
  );
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "Contents.json"), JSON.stringify({ info: { author: "xcode", version: 1 } }, null, 2) + "\n");

let count = 0;
for (let stage = 1; stage <= 8; stage++) {
  const svg = clean(renderToStaticMarkup(<FlatTurkey stage={stage} size={200} />));
  writeImageset(`turkey_stage_${stage}`, svg);
  count++;
}

const skipped: string[] = [];
for (const item of SHOP_CATALOG) {
  if (NATIVE_BACKGROUNDS.has(item.id)) { skipped.push(item.id); continue; }
  const Render = ITEM_RENDERERS[item.id];
  if (!Render) { console.warn(`no renderer for shop item ${item.id}`); continue; }
  const svg = clean(
    renderToStaticMarkup(
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
        <Render />
      </svg>
    )
  );
  writeImageset(`item_${item.id}`, svg);
  count++;
}

console.log(`wrote ${count} imagesets to ${OUT}`);
console.log(`drawn natively in SwiftUI (not exported): ${skipped.join(", ")}`);

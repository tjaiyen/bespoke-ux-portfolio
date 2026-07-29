#!/usr/bin/env node
/**
 * Post-process the static export so it is deployable to any static host.
 *
 * Three things Next does not do, each of which fails silently on GitHub Pages:
 *
 *  1. **`.nojekyll`** — Pages runs Jekyll by default, and Jekyll ignores every path
 *     beginning with an underscore. That is the whole of `_next/`: every script, style
 *     and font. Documented Pages behaviour rather than something reproducible locally,
 *     so this is a cheap precaution, not a verified fix.
 *
 *  2. **An extension on the OG image.** Next emits the generated card as
 *     `out/opengraph-image` — a real 1200x630 PNG with no `.png`. Static hosts pick
 *     `Content-Type` by extension, so it is served as `application/octet-stream`, and
 *     LinkedIn, Slack and Twitter render only `image/*`. The share card silently does
 *     not appear. Copying it to `opengraph-image.png` makes the content type correct on
 *     every host; `layout.tsx` points the metadata at that path.
 *
 *  3. **`CNAME`** — a custom domain on Pages needs this file in the published output, or
 *     the domain setting is dropped on the next deploy.
 *
 * Usage: node scripts/finalize-export.mjs [--dir out] [--cname example.com]
 * Exit 0 = done · 2 = no export found.
 */
import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const arg = (n) => {
  const i = argv.indexOf(n);
  return i >= 0 ? argv[i + 1] : undefined;
};

const dir = arg("--dir") ?? "out";
const cname = arg("--cname") ?? process.env.NEXT_PUBLIC_CNAME ?? "";

if (!fs.existsSync(dir)) {
  console.error(`no export at ./${dir} — nothing to finalize`);
  process.exit(2);
}

const done = [];

// 1. Jekyll would eat _next/
fs.writeFileSync(path.join(dir, ".nojekyll"), "");
done.push(".nojekyll");

// 2. Give the OG card a real extension so hosts serve it as image/png.
const og = path.join(dir, "opengraph-image");
const ogPng = path.join(dir, "opengraph-image.png");
if (fs.existsSync(og) && fs.statSync(og).isFile()) {
  fs.copyFileSync(og, ogPng);
  done.push(`opengraph-image.png (${(fs.statSync(ogPng).size / 1024).toFixed(0)} KB)`);
} else if (!fs.existsSync(ogPng)) {
  console.warn(
    "  warn: no opengraph-image in the export — link shares will render without a card",
  );
}

// 3. Custom domain, when one is configured.
if (cname) {
  fs.writeFileSync(path.join(dir, "CNAME"), cname.replace(/^https?:\/\//, "").trim() + "\n");
  done.push(`CNAME -> ${cname}`);
}

console.log(`finalized ./${dir}: ${done.join(" · ")}`);

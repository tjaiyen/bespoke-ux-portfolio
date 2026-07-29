#!/usr/bin/env node
/**
 * Rebuild `public/gallery` from the Blocksmith showcase output.
 *
 * The gallery's claim is specific: *every site here passed a real accessibility gate, and
 * ships the conformance report from that run*. That is only true if the receipts are
 * regenerated against the copy that actually ships — the source project's own README
 * claimed persisted reports for 35 sites when 9 existed on disk, and publishing on the
 * strength of that claim would have been the exact failure this gallery argues against.
 *
 * So this script does not copy receipts. It runs the gate, and a site is published only
 * if the gate exits 0. A failing site is a reason not to ship it, not something to show
 * with a caveat.
 *
 * It also dedupes the vendored three.js: each source site carries its own 1.3 MB copy,
 * which is 61 MB across the set. One shared `_vendor/` and rewritten import paths brings
 * that to a few megabytes.
 *
 * Usage:
 *   node scripts/sync-gallery.mjs [--source ~/dev/blocksmith] [--apply] [--shots]
 *
 * Read-only by default: prints what would change and exits. `--apply` writes.
 * `--shots` additionally regenerates screenshots (needs Chrome + a local port).
 * Exit 0 = ok · 1 = a candidate failed the gate or a step errored · 2 = usage.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";

const argv = process.argv.slice(2);
const arg = (n) => {
  const i = argv.indexOf(n);
  return i >= 0 ? argv[i + 1] : undefined;
};
const APPLY = argv.includes("--apply");
const SHOTS = argv.includes("--shots");
const SOURCE = (arg("--source") ?? path.join(os.homedir(), "dev", "blocksmith")).replace(
  /^~/,
  os.homedir(),
);

const SHOWCASE = path.join(SOURCE, "examples", "showcase");
const AUDIT_BIN = path.join(SOURCE, "packages", "audit", "bin", "blocksmith-audit.ts");
const GALLERY = path.join(process.cwd(), "public", "gallery");

if (!fs.existsSync(SHOWCASE) || !fs.existsSync(AUDIT_BIN)) {
  console.error(`blocksmith not found at ${SOURCE}`);
  console.error("usage: node scripts/sync-gallery.mjs [--source <dir>] [--apply] [--shots]");
  process.exit(2);
}

/** Every directory holding an index.html, including the nested variant sets. */
function candidates() {
  const out = [];
  for (const name of fs.readdirSync(SHOWCASE).sort()) {
    const dir = path.join(SHOWCASE, name);
    if (!fs.statSync(dir).isDirectory()) continue;
    if (fs.existsSync(path.join(dir, "index.html"))) {
      out.push({ slug: name, dir });
      continue;
    }
    // A container of variants on one brief (e.g. variants-kettle/variant-1). Published
    // individually, with the shared brief named in the slug so the count stays honest —
    // three variants of one design are not three designs.
    for (const sub of fs.readdirSync(dir).sort()) {
      const sdir = path.join(dir, sub);
      if (fs.statSync(sdir).isDirectory() && fs.existsSync(path.join(sdir, "index.html"))) {
        out.push({
          slug: `${name.replace(/^variants-/, "")}-${sub.replace(/^variant-/, "v")}`,
          dir: sdir,
          variantOf: name.replace(/^variants-/, ""),
        });
      }
    }
  }
  return out;
}

/** Run the real gate. Returns the ACR, or null if the site did not pass. */
function gate(dir, slug, tmp) {
  const reportBase = path.join(tmp, slug);
  try {
    execFileSync(
      process.execPath,
      [AUDIT_BIN, dir, "--grader-resolved-contrast", "--report", reportBase],
      { stdio: "pipe", cwd: SOURCE },
    );
  } catch {
    return null; // non-zero exit = did not provably pass
  }
  const j = `${reportBase}.json`;
  if (!fs.existsSync(j)) return null;
  return {
    json: JSON.parse(fs.readFileSync(j, "utf8")),
    markdown: fs.readFileSync(`${reportBase}.md`, "utf8"),
  };
}

/** Copy a site, skipping its private vendor copy, rewriting imports to the shared one. */
function copySite(srcDir, destDir) {
  const files = [];
  (function walk(d, rel) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (e.name === "vendor") continue; // deduped into _vendor/
        walk(path.join(d, e.name), path.join(rel, e.name));
      } else {
        files.push(path.join(rel, e.name));
      }
    }
  })(srcDir, "");

  for (const rel of files) {
    const from = path.join(srcDir, rel);
    const to = path.join(destDir, rel);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    if (/\.(html|css|js|mjs|json|txt|svg)$/i.test(rel)) {
      // Depth-aware rewrite: a file d levels below the site root reaches the shared
      // vendor at ../ repeated (d+1) times. index.html -> ../_vendor/, src/main.js ->
      // ../../_vendor/. Computing it beats hardcoding, since sites nest differently.
      const depth = rel.split(path.sep).length - 1;
      const prefix = "../".repeat(depth + 1) + "_vendor/";
      const body = fs
        .readFileSync(from, "utf8")
        .replace(/(?:\.\.\/)*vendor\//g, prefix);
      fs.writeFileSync(to, body);
    } else {
      fs.copyFileSync(from, to);
    }
  }
  return files.length;
}

/**
 * Decode the HTML entities a descriptor arrives with.
 *
 * These strings are pulled out of markup, so `&` is encoded — and React escapes on the
 * way back out, so an undecoded value renders as a literal "&amp;" on the card. Four of
 * the 47 hit this.
 */
function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)));
}

/** A short descriptor taken from the site's OWN <title>, never invented. */
function derivedNote(dir) {
  try {
    const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
    const desc = html
      .match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1]
      ?.trim();
    const raw = desc || title;
    return raw ? decodeEntities(raw) : undefined;
  } catch {
    return undefined;
  }
}

// ---- run ----------------------------------------------------------------------------
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gallery-gate-"));
const list = candidates();
console.log(`${list.length} candidate site(s) under ${SHOWCASE}\n`);

const passed = [];
const failed = [];
for (const c of list) {
  const acr = gate(c.dir, c.slug, tmp);
  if (!acr || acr.json.pass !== true) {
    failed.push(c.slug);
    console.log(`  GATE FAIL  ${c.slug}`);
    continue;
  }
  passed.push({ ...c, acr });
}
console.log(`\ngate: ${passed.length} passed · ${failed.length} failed`);

const existing = fs.existsSync(path.join(GALLERY, "_receipts"))
  ? fs
      .readdirSync(path.join(GALLERY, "_receipts"))
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""))
  : [];
const added = passed.map((p) => p.slug).filter((s) => !existing.includes(s));
console.log(
  `gallery: ${existing.length} published now · ${passed.length} would be published · ${added.length} new`,
);
if (added.length) console.log(`  new: ${added.join(", ")}`);

if (!APPLY) {
  console.log("\ndry run — pass --apply to write");
  process.exit(failed.length ? 1 : 0);
}

// Shared vendor, copied once from the first site that has one.
const vendorDest = path.join(GALLERY, "_vendor");
fs.mkdirSync(vendorDest, { recursive: true });
for (const p of passed) {
  const v = path.join(p.dir, "vendor");
  if (!fs.existsSync(v)) continue;
  for (const f of fs.readdirSync(v)) {
    const to = path.join(vendorDest, f);
    if (!fs.existsSync(to)) fs.copyFileSync(path.join(v, f), to);
  }
}

const receiptsDir = path.join(GALLERY, "_receipts");
fs.mkdirSync(receiptsDir, { recursive: true });
const notes = {};
let fileCount = 0;

for (const p of passed) {
  const dest = path.join(GALLERY, p.slug);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  fileCount += copySite(p.dir, dest);

  fs.writeFileSync(
    path.join(receiptsDir, `${p.slug}.json`),
    JSON.stringify(p.acr.json, null, 2),
  );
  fs.writeFileSync(path.join(receiptsDir, `${p.slug}.md`), p.acr.markdown);

  let n = derivedNote(p.dir);
  // Variants of one brief share a <meta description>, so two cards would carry byte-
  // identical text and read as a duplication bug rather than as three takes on one
  // brief. Number them from the set actually published.
  if (n && p.variantOf) {
    const siblings = passed.filter((q) => q.variantOf === p.variantOf);
    const i = siblings.findIndex((q) => q.slug === p.slug) + 1;
    n = `${n} (variant ${i} of ${siblings.length})`;
  }
  if (n) notes[p.slug] = n;
}

fs.writeFileSync(
  path.join(GALLERY, "_notes.json"),
  JSON.stringify(
    {
      _comment:
        "Descriptors taken from each generated site's own <title>/description. Editorial notes in src/lib/gallery.ts take precedence; this is the honest fallback for the rest, not invented copy.",
      notes,
    },
    null,
    2,
  ),
);

console.log(`\nwrote ${passed.length} site(s), ${fileCount} file(s), ${Object.keys(notes).length} derived note(s)`);
if (SHOTS) console.log("run scripts/gallery-shots.mjs to regenerate screenshots");
process.exit(failed.length ? 1 : 0);

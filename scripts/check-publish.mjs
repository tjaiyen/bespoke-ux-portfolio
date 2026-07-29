#!/usr/bin/env node
/**
 * Pre-publish gate. Runs against the exported `out/` directory — the bytes that actually
 * reach the public — not against the dev server.
 *
 * Every check here exists because the corresponding failure was observed, is completely
 * invisible locally, and would have shipped:
 *
 *   PUB1  `NEXT_PUBLIC_SITE_URL` unset at build time bakes `http://localhost:3000` into
 *         sitemap.xml, robots.txt, llms.txt, /api/projects.json and every og:/twitter:
 *         tag. The site looks perfect and the build is green — but a LinkedIn or Slack
 *         unfurl points at localhost, so the share card silently does not render and
 *         search engines are handed a sitemap of unreachable URLs. Measured: 20 localhost
 *         references across the published artifacts.
 *   PUB2  A GitHub Pages *project* site serves from `/<repo>/`. With no basePath the HTML
 *         returns 200 and every asset 404s, so a recruiter following the link sees raw
 *         unstyled HTML. Verified by serving the export under a subpath.
 *   PUB3  The NDA blocklist still holding REPLACE_ME placeholders means all three NDA
 *         gates match nothing. They report clean because there is nothing to find, which
 *         is not the same as being clean.
 *   PUB4  A portfolio published for recruiters with no contact route is a dead end. The
 *         footer degrades honestly to "not published yet" — correct while private,
 *         self-defeating the moment it is public.
 *   PUB5  Absolute local paths (/Users/<name>, $HOME) leaking into shipped files.
 *
 * Usage: node scripts/check-publish.mjs --base <https://origin[/path]> [--dir out]
 * Exit 0 = publishable · 1 = at least one finding · 2 = usage/config error.
 */
import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const arg = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};

const base = arg("--base");
const dir = arg("--dir") ?? "out";

if (!base || !/^https?:\/\//.test(base)) {
  console.error(
    "usage: node scripts/check-publish.mjs --base <https://origin[/path]> [--dir out]",
  );
  console.error(
    "  --base is the PUBLIC url the site will be served from, e.g.\n" +
      "    https://tjaiyen.github.io/bespoke-ux-portfolio   (Pages project site)\n" +
      "    https://theerayutjaiyen.com                      (custom domain / Vercel)",
  );
  process.exit(2);
}

if (!fs.existsSync(dir)) {
  console.error(`no export at ./${dir} — run \`npm run build:static\` first`);
  process.exit(2);
}

const findings = [];
const fail = (code, msg) => {
  findings.push({ code, msg });
  console.log(`  FAIL [${code}] ${msg}`);
};

const baseUrl = new URL(base);
const basePath = baseUrl.pathname.replace(/\/$/, ""); // "" for a root deploy

// Walk every text-ish file in the export.
const TEXT = new Set([".html", ".txt", ".xml", ".json", ".js", ".css", ".webmanifest"]);
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (TEXT.has(path.extname(e.name))) files.push(p);
  }
})(dir);

console.log(`checking ${files.length} text file(s) in ./${dir} against ${base}\n`);

// ---- PUB1: no localhost anywhere in the published bytes -----------------------------
{
  const hits = [];
  for (const f of files) {
    const body = fs.readFileSync(f, "utf8");
    const n = (body.match(/localhost:\d+|127\.0\.0\.1/g) || []).length;
    if (n) hits.push(`${path.relative(dir, f)} (${n})`);
  }
  if (hits.length)
    fail(
      "PUB1",
      `localhost baked into ${hits.length} file(s) — set NEXT_PUBLIC_SITE_URL at BUILD time: ${hits.slice(0, 6).join(", ")}${hits.length > 6 ? " …" : ""}`,
    );
}

// ---- PUB1b: the canonical surfaces must carry the real origin -----------------------
for (const rel of ["sitemap.xml", "robots.txt", "llms.txt", "api/projects.json"]) {
  const f = path.join(dir, rel);
  if (!fs.existsSync(f)) {
    fail("PUB1b", `${rel} missing from the export`);
    continue;
  }
  if (!fs.readFileSync(f, "utf8").includes(baseUrl.origin))
    fail("PUB1b", `${rel} contains no reference to ${baseUrl.origin}`);
}

// ---- PUB1c: social preview resolves to a real, absolute image -----------------------
{
  const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
  const og = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
  if (!og) fail("PUB1c", "index.html declares no og:image — link shares render without a card");
  else if (!og.startsWith(baseUrl.origin))
    fail("PUB1c", `og:image points at "${og}", not ${baseUrl.origin}`);
  else {
    // Strip origin, basePath and any cache-busting query, then confirm the file exists.
    let p = og.slice(baseUrl.origin.length).split("?")[0];
    if (basePath && p.startsWith(basePath)) p = p.slice(basePath.length);
    if (!fs.existsSync(path.join(dir, p)))
      fail("PUB1c", `og:image "${og}" has no corresponding file at ${dir}${p}`);
    // The extension check is the point, not a formality. Next's generated
    // `opengraph-image` route emits a real PNG with NO extension; static hosts pick
    // Content-Type by extension and serve it as application/octet-stream, and LinkedIn,
    // Slack and Twitter render only image/*. The first version of this check stripped
    // the query, found the extensionless file present, and reported clean — it verified
    // the wrong file while the defect stood.
    else if (!/\.(png|jpg|jpeg|webp|gif)$/i.test(p))
      fail(
        "PUB1c",
        `og:image "${og}" has no image file extension — static hosts will serve it as application/octet-stream and no share card will render`,
      );
  }
}

// ---- PUB2: asset URLs must match the deploy path ------------------------------------
// Scans EVERY html file, not just index.html. Scanning only the entry page is how the
// first version of this check passed the three broken /gallery/ links — the ones the
// portfolio's whole "check the receipts yourself" argument depends on.
{
  const htmlFiles = files.filter((f) => f.endsWith(".html"));
  const wrong = new Map(); // url -> first file it appeared in
  for (const f of htmlFiles) {
    const html = fs.readFileSync(f, "utf8");
    for (const m of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
      const a = m[1];
      // Only paths that resolve to a file on disk are assets; route links are handled
      // by Next's own basePath rewriting and are not our concern here.
      const isAsset = /^\/(_next|images|gallery)\//.test(a) || /\.\w{2,5}(\?|$)/.test(a);
      if (!isAsset) continue;
      if (basePath) {
        if (!a.startsWith(basePath + "/")) wrong.set(a, path.relative(dir, f));
      } else if (/^\/[^/]+\/_next\//.test(a)) {
        wrong.set(a, path.relative(dir, f));
      }
    }
  }
  if (wrong.size) {
    const sample = [...wrong.entries()].slice(0, 4).map(([u, f]) => `${u} (in ${f})`);
    fail(
      "PUB2",
      basePath
        ? `${wrong.size} asset URL(s) are root-absolute but the site deploys under "${basePath}" — they will 404. e.g. ${sample.join(", ")}`
        : `${wrong.size} asset URL(s) carry a basePath but --base has none. e.g. ${sample.join(", ")}`,
    );
  }
}

// ---- PUB3: the NDA blocklist must be real -------------------------------------------
{
  const f = ".nda-blocklist";
  if (!fs.existsSync(f)) fail("PUB3", ".nda-blocklist is missing — three NDA gates read it");
  else {
    const terms = fs
      .readFileSync(f, "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));
    const placeholders = terms.filter((t) => t.startsWith("REPLACE_ME"));
    if (placeholders.length)
      fail(
        "PUB3",
        `.nda-blocklist still holds ${placeholders.length} placeholder(s) (${placeholders.join(", ")}) — the NDA gates match nothing and report clean vacuously`,
      );
    if (!terms.length) fail("PUB3", ".nda-blocklist has no usable terms");
  }
}

// ---- PUB4: a recruiter must have a way to make contact ------------------------------
{
  const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
  if (html.includes("not published yet") || html.includes("src/lib/site.ts"))
    fail(
      "PUB4",
      "no contact route is published — the footer still renders its honest placeholder. Set email/linkedin in src/lib/site.ts before publishing to recruiters.",
    );
}

// ---- PUB5: no local filesystem paths in shipped bytes -------------------------------
{
  const home = process.env.HOME ?? "";
  const hits = [];
  for (const f of files) {
    const body = fs.readFileSync(f, "utf8");
    if (/\/Users\/[a-z]/i.test(body) || (home && body.includes(home)))
      hits.push(path.relative(dir, f));
  }
  if (hits.length)
    fail("PUB5", `local filesystem path leaked into ${hits.length} file(s): ${hits.slice(0, 4).join(", ")}`);
}

console.log(
  `\n${"=".repeat(64)}\n${
    findings.length
      ? `NOT PUBLISHABLE: ${findings.length} finding(s) above.`
      : `PUBLISHABLE: 0 findings. ${files.length} files checked against ${base}.`
  }`,
);
process.exit(findings.length ? 1 : 0);

#!/usr/bin/env node
/**
 * Generates .pa11yci.json with EVERY route, deriving case-study URLs from content
 * rather than hardcoding them (amendment A6).
 *
 * Hardcoding the slug list is how a case study silently escapes the audit: someone adds
 * a study, never touches .pa11yci.json, and pa11y-ci stays green while auditing a route
 * set that no longer matches the site. Reading the same published-slug source the router
 * uses keeps them in lockstep by construction.
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const BASE = process.env.PA11Y_BASE_URL ?? "http://localhost:3000";
const CONTENT_DIR = path.join(process.cwd(), "content", "case-studies");

const STATIC_ROUTES = ["/", "/case-studies", "/design-system"];

function publishedSlugs() {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .filter((f) => {
      const { data } = matter(fs.readFileSync(path.join(CONTENT_DIR, f), "utf8"));
      return data.published === true;
    })
    .map((f) => f.replace(/\.mdx$/, ""));
}

const slugs = publishedSlugs();
const urls = [
  ...STATIC_ROUTES.map((r) => BASE + r),
  ...slugs.map((s) => `${BASE}/case-studies/${s}`),
];

// Puppeteer's bundled Chrome download can truncate silently (observed 2026-07-28: the
// installer reported success while leaving a 448 KB stub with no Framework binary, so
// every launch died with a dlopen error). PA11Y_CHROME_PATH lets the run point at any
// working Chrome — a system install locally, the Actions-provided browser in CI —
// rather than hardcoding a machine-specific path into committed config.
const chromeLaunchConfig = {
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
  ...(process.env.PA11Y_CHROME_PATH
    ? { executablePath: process.env.PA11Y_CHROME_PATH }
    : {}),
};

const config = {
  defaults: {
    standard: "WCAG2AA",
    timeout: 30000,
    // Wait for hydration so dynamically-registered ARIA state is present in the DOM.
    // Auditing pre-hydration would miss aria-expanded/aria-live entirely.
    wait: 500,
    chromeLaunchConfig,
  },
  urls,
};

fs.writeFileSync(".pa11yci.json", JSON.stringify(config, null, 2) + "\n");
console.log(
  `.pa11yci.json written: ${urls.length} route(s) — ${STATIC_ROUTES.length} static + ${slugs.length} case study/-ies`,
);
for (const u of urls) console.log("  " + u);
if (slugs.length === 0) {
  console.log(
    "\nNOTE: zero published case studies, so no /case-studies/<slug> route was audited.\n" +
      "The per-slug audit is UNVERIFIED until real content exists — do not read a green\n" +
      "run as covering case-study templates.",
  );
}

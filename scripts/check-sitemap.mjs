#!/usr/bin/env node
/**
 * Fails if a public route is in neither the sitemap nor the documented exclusion list.
 *
 * /about shipped absent from the sitemap because the route list was hardcoded — the
 * fourth time a hardcoded route list silently dropped a page in this project. The others
 * were fixed by deriving from the filesystem; the sitemap cannot do that safely inside
 * the Next build graph, so it gets a checker instead. Either omission is deliberate and
 * documented in EXCLUDED, or the build fails.
 *
 * Run against a live server: node scripts/check-sitemap.mjs [baseUrl]
 */
import { staticRoutes, publishedCaseStudyRoutes } from "../src/lib/routes.mjs";

const BASE = process.argv[2] ?? "http://localhost:3000";

// Kept in sync with EXCLUDED in src/app/sitemap.ts (a build-graph import is unsafe here).
const EXCLUDED = new Set(["/design-system"]);

const res = await fetch(`${BASE}/sitemap.xml`);
if (!res.ok) {
  console.error(`ERROR: could not fetch ${BASE}/sitemap.xml (${res.status})`);
  process.exit(1);
}
const xml = await res.text();
const listed = new Set(
  [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
    new URL(m[1]).pathname.replace(/\/$/, "") || "/",
  ),
);

const expected = [...staticRoutes(), ...publishedCaseStudyRoutes()];
const missing = expected.filter((r) => !listed.has(r) && !EXCLUDED.has(r));
const stray = [...listed].filter((r) => !expected.includes(r));

console.log(`sitemap: ${listed.size} URL(s); routes: ${expected.length}`);
for (const r of expected) {
  const state = listed.has(r) ? "in sitemap" : EXCLUDED.has(r) ? "excluded (documented)" : "MISSING";
  console.log(`  ${state.padEnd(22)} ${r}`);
}
for (const s of stray) console.log(`  STRAY (not a route)   ${s}`);

if (missing.length || stray.length) {
  console.error(
    `\nFAIL: ${missing.length} route(s) missing from the sitemap, ${stray.length} stray entr(ies).`,
  );
  process.exit(1);
}
console.log("\nPASS: every public route is in the sitemap or documented as excluded.");

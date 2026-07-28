import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

/**
 * Every auditable route, discovered rather than listed.
 *
 * Hardcoding route lists has now bitten this project three times: pa11y missed the
 * case-study slugs, the tier-2 audit missed them too, and both missed /about the moment
 * it was added — each time while reporting a clean run. A hardcoded list is a promise
 * someone has to remember to keep. Walking `src/app` for page files and reading the
 * published slugs from content means a new page is audited because it exists.
 */
const APP_DIR = path.join(process.cwd(), "src", "app");
const CONTENT_DIR = path.join(process.cwd(), "content", "case-studies");

/** Static routes: every page file under src/app, excluding dynamic [slug] segments. */
export function staticRoutes() {
  const out = [];
  const walk = (dir, segments) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        // Skip dynamic segments and route groups — the former are enumerated from
        // content, the latter do not appear in the URL.
        if (entry.name.startsWith("[")) continue;
        if (entry.name.startsWith("(") || entry.name.startsWith("_")) {
          walk(path.join(dir, entry.name), segments);
          continue;
        }
        walk(path.join(dir, entry.name), [...segments, entry.name]);
      } else if (/^page\.(tsx|ts|jsx|js)$/.test(entry.name)) {
        out.push("/" + segments.join("/"));
      }
    }
  };
  walk(APP_DIR, []);
  return [...new Set(out)].sort();
}

export function publishedCaseStudyRoutes() {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .filter((f) => matter(fs.readFileSync(path.join(CONTENT_DIR, f), "utf8")).data.published === true)
    .map((f) => `/case-studies/${f.replace(/\.mdx$/, "")}`)
    .sort();
}

export function allRoutes() {
  return [...staticRoutes(), ...publishedCaseStudyRoutes()];
}

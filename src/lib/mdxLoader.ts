import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
// DEVIATION 4 from the vault spec (ADR-001): the spec imports `compileMDX` from
// "next-mdx-remote-client/rsc". That export does not exist in this package — it belongs to
// the ORIGINAL `next-mdx-remote`. The `-client` fork (v2.1.11) exports `evaluate` and
// `MDXRemote` instead. Verified against node_modules/next-mdx-remote-client/dist/rsc/index.d.ts;
// the build fails outright with "The export compileMDX was not found in module". The package
// choice in ADR-001 stands — only the API name was wrong.
import { evaluate } from "next-mdx-remote-client/rsc";
import { caseStudySchema, type CaseStudyFrontmatter } from "./caseStudySchema";
import { mdxComponents } from "./mdxComponents";

const CONTENT_DIR = path.join(process.cwd(), "content", "case-studies");
const BLOCKLIST_PATH = path.join(process.cwd(), ".nda-blocklist");

/**
 * Reads the committed .nda-blocklist — the single source of NDA terms (amendment A3),
 * shared with the CI grep and the pre-commit hook.
 *
 * DEVIATION 1 from the vault spec: strips `#` comment lines as well as blanks. The spec
 * stripped only blanks, so a documentation line like "# Acme Corp is the client" became a
 * literal match term. The CI grep already strips comments; a loader that did not would
 * disagree with CI about what the blocklist even contains.
 *
 * DEVIATION 2: throws when no usable terms remain. The spec would hand an empty array to
 * the scanner, which then matches nothing and reports every file clean — a false pass on
 * the one gate that exists to prevent an NDA breach. An empty blocklist is a broken gate,
 * not an empty one.
 */
function readBlocklist(): string[] {
  if (!fs.existsSync(BLOCKLIST_PATH)) {
    throw new Error("NDA gate: .nda-blocklist file missing at repo root");
  }
  const terms = fs
    .readFileSync(BLOCKLIST_PATH, "utf8")
    .split("\n")
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !t.startsWith("#"));

  if (terms.length === 0) {
    throw new Error(
      "NDA gate: .nda-blocklist contains no usable terms (all blank or comment lines). " +
        "An empty blocklist would silently pass every case study. Build aborted.",
    );
  }
  return terms;
}

function assertNoNdaViolations(
  slug: string,
  title: string,
  client: string,
  body: string,
) {
  const haystack = `${title}\n${client}\n${body}`.toLowerCase();
  for (const term of readBlocklist()) {
    if (haystack.includes(term.toLowerCase())) {
      throw new Error(
        `NDA VIOLATION in ${slug}: blocklisted term "${term}" found. Build aborted.`,
      );
    }
  }
}

/**
 * Concept studies may not narrate research, outcomes or history that did not happen.
 *
 * This exists because they did. Three concept studies — each badged "No organisation
 * commissioned it and it was not shipped to production" — simultaneously claimed four
 * half-day shadow sessions with named roles, a quoted CFO, a quoted controller, launch
 * dates ("launched in April 2024", "launched in September 2023"), first-quarter adoption
 * figures, redeployed analysts and a two-release feature history. The badge sat directly
 * beside the contradiction, which is worse than either alone: it invites the reader to
 * ask who the four controllers were.
 *
 * A portfolio whose argument is that claims should be checkable cannot rely on remembering
 * to keep its own prose honest. So the build enforces it, exactly like the NDA gate above.
 *
 * Scoped to `projectType: "concept"` on purpose. The same sentence is legitimate in a
 * self-directed study that really shipped — `finance-data-pipeline-and-agent` says "I
 * built it" because he did.
 */
const CONCEPT_CLAIM_PATTERNS: { re: RegExp; why: string }[] = [
  {
    re: /\bI (?:ran|conducted|interviewed|shadowed|observed|recorded|facilitated|moderated|surveyed)\b/i,
    why: "first-person conducted research",
  },
  {
    re: /\b(?:shadow session|contextual inquiry|card sort with|usability test(?:ing)? with|cognitive walkthrough)/i,
    why: "a named research method presented as performed",
  },
  {
    re: /\b(?:told me|told us|explicitly told)\b/i,
    why: "a quoted or reported participant",
  },
  {
    re: /\blaunched in (?:January|February|March|April|May|June|July|August|September|October|November|December|\d{4})/i,
    why: "a launch date for something never built",
  },
  {
    re: /\bwithin the first quarter\b|\bin the first release\b|\bin the second release\b/i,
    why: "post-launch history",
  },
];

function assertNoFabricatedClaims(
  slug: string,
  projectType: string,
  body: string,
) {
  if (projectType !== "concept") return;
  for (const { re, why } of CONCEPT_CLAIM_PATTERNS) {
    const hit = body.match(re);
    if (hit) {
      throw new Error(
        `FABRICATED CLAIM in ${slug} (projectType: concept): found "${hit[0]}" — ${why}. ` +
          `A concept study must not narrate research, outcomes or history that did not ` +
          `happen. Rewrite it as what grounds the design, or what you would run and what ` +
          `would falsify it. Build aborted.`,
      );
    }
  }
}

function readAndValidate(slug: string): {
  frontmatter: CaseStudyFrontmatter;
  content: string;
} {
  const raw = fs.readFileSync(path.join(CONTENT_DIR, `${slug}.mdx`), "utf8");
  const { data, content } = matter(raw);
  const parsed = caseStudySchema.safeParse({ ...data, slug });

  if (!parsed.success) {
    // DEVIATION 3 from the vault spec: fail loudly instead of silently skipping.
    // The spec's listPublishedSlugs() used safeParse and filtered failures out of the
    // list, so a case study with a typo'd or missing field would vanish from the site
    // with a green build — the opposite of the spec's own stated property that "any
    // schema violation throws, so npm run build fails loudly". Silent content loss is
    // worse than a broken build: you ship a portfolio missing a case study and never
    // find out. Every .mdx under content/case-studies/ must be valid; use
    // `published: false` to withhold a study, not malformed frontmatter.
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid case-study frontmatter in ${slug}.mdx:\n${issues}\n` +
        `Fix the frontmatter, or set published: false to withhold it. Build aborted.`,
    );
  }

  assertNoNdaViolations(slug, parsed.data.title, parsed.data.client, content);
  assertNoFabricatedClaims(slug, parsed.data.projectType, content);
  return { frontmatter: parsed.data, content };
}

/** Top-level section headings, in document order — powers the case-study TOC. */
export function sectionHeadings(content: string): string[] {
  return [...content.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
}

export async function loadCaseStudy(slug: string) {
  const { frontmatter, content } = readAndValidate(slug);
  const headings = sectionHeadings(content);

  // gray-matter has already stripped the frontmatter, so parseFrontmatter stays false.
  const { content: mdx, error } = await evaluate({
    source: content,
    components: mdxComponents,
    options: { parseFrontmatter: false },
  });

  // DEVIATION 5: evaluate() RETURNS an error rather than throwing it. Ignoring that field
  // — as a direct port of the spec's compileMDX call would — means an MDX syntax error or
  // an unregistered component renders as empty content with a green build. Rethrow so the
  // build fails at the offending file, consistent with every other gate in this loader.
  // Catches MDX *compile* failures (syntax errors). An unregistered component is a
  // different failure: it compiles fine and is caught later by the prerenderer with
  // "Expected component `X` to be defined". Both abort the build — verified separately.
  if (error) {
    throw new Error(
      `MDX compilation failed in ${slug}.mdx: ${error.message}\nBuild aborted.`,
    );
  }

  return { frontmatter, mdx, headings };
}

/** Frontmatter for every published study, validated. Throws on any invalid file. */
export function listPublishedCaseStudies(): CaseStudyFrontmatter[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => readAndValidate(f.replace(/\.mdx$/, "")).frontmatter)
    .filter((fm) => fm.published)
    .sort((a, b) => a.title.localeCompare(b.title));
}

export type CaseStudyFrontmatterList = CaseStudyFrontmatter[];

/** Real, built work — leads the portfolio. */
export function listRealCaseStudies(): CaseStudyFrontmatter[] {
  return listPublishedCaseStudies().filter((s) => s.projectType !== "concept");
}

/** Concept explorations — shown below the real work, never mixed into it. */
export function listConceptCaseStudies(): CaseStudyFrontmatter[] {
  return listPublishedCaseStudies().filter((s) => s.projectType === "concept");
}

export function listPublishedSlugs(): string[] {
  return listPublishedCaseStudies().map((fm) => fm.slug);
}

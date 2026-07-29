import fs from "node:fs";
import path from "node:path";

/**
 * The gallery: generated sites that passed a real accessibility gate, each shipping with
 * the machine-readable conformance report produced by that run.
 *
 * Every receipt here was regenerated against the copy that actually ships in `public/`,
 * not inherited. The source project's own README claimed persisted reports for 35 sites;
 * only 9 existed on disk. Publishing on the strength of that claim would have been the
 * exact failure this gallery exists to argue against — so each site was re-audited and
 * only fresh passes are listed.
 */

const GALLERY_DIR = path.join(process.cwd(), "public", "gallery");
const RECEIPTS_DIR = path.join(GALLERY_DIR, "_receipts");

export type Criterion = {
  sc: string;
  name: string;
  level: string;
  status: string;
  notes?: string;
};

export type Invariant = { name: string; status: string };

export type Receipt = {
  slug: string;
  pass: boolean;
  pagesAudited: number;
  meta: { product: string; date: string; tool: string; axeVersion: string };
  criteria: Criterion[];
  structuralInvariants: Invariant[];
  notEvaluated: { sc: string; name: string; level: string; notes?: string }[];
  failedWcagTags: string[];
};

/** Human-facing note on what each site explores. Editorial, not derived. */
const NOTES: Record<string, string> = {
  meridian: "Editorial layout, restrained palette, type-led hierarchy",
  ascend: "Bold display type over a dark immersive stage",
  halcyon: "Soft gradient depth with a calm, low-contrast surface treatment",
  pomelo: "Dopamine colour — saturated, high-energy, still contrast-compliant",
  volt: "Retrofuturist neon on near-black, testing the contrast floor",
  carbon: "Neo-brutalist structure; heavy rules and blocky composition",
  baseline: "The control: minimal, no 3D — the reference the others are measured against",
  chain: "Linked-node motion study; canvas kept decorative by construction",
  grove: "Organic forms, generous whitespace, nature-derived palette",
  tidal: "Fluid motion with reduced-motion adherence",
  borealis: "Aurora gradients over a dark field",
  caldera: "Warm maximalism — dense layering without losing the heading outline",
};

export function listGallery(): Receipt[] {
  if (!fs.existsSync(RECEIPTS_DIR)) return [];
  return fs
    .readdirSync(RECEIPTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const slug = f.replace(/\.json$/, "");
      const raw = JSON.parse(
        fs.readFileSync(path.join(RECEIPTS_DIR, f), "utf8"),
      );
      return { slug, ...raw } as Receipt;
    })
    // Only publish sites that actually passed. A failing receipt is a reason not to
    // ship the site, not something to display with a caveat.
    .filter((r) => r.pass === true)
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

export function noteFor(slug: string): string | undefined {
  return NOTES[slug];
}

/** Counts used in the card summary. Derived from the receipt, never hand-entered. */
export function receiptSummary(r: Receipt) {
  const supports = r.criteria.filter((c) => c.status === "Supports").length;
  const partial = r.criteria.filter((c) =>
    c.status.startsWith("Partially"),
  ).length;
  return {
    supports,
    partial,
    invariants: r.structuralInvariants.length,
    invariantsPassed: r.structuralInvariants.filter((i) => i.status === "pass")
      .length,
    notEvaluated: r.notEvaluated.length,
  };
}

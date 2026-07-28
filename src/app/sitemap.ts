import type { MetadataRoute } from "next";
import { listPublishedCaseStudies } from "@/lib/mdxLoader";

/**
 * Sitemap. Case-study entries are derived from published frontmatter — the same source
 * the router and the pa11y config read — so a new study appears in all three at once.
 *
 * `/design-system` is deliberately absent: it is an internal verification harness marked
 * noindex, and listing a noindex URL in a sitemap is a contradictory signal to crawlers.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const studies = listPublishedCaseStudies();

  return [
    { url: base, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/case-studies`, changeFrequency: "monthly", priority: 0.8 },
    ...studies.map((s) => ({
      url: `${base}/case-studies/${s.slug}`,
      changeFrequency: "yearly" as const,
      priority: 0.7,
    })),
  ];
}

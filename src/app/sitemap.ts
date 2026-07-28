import type { MetadataRoute } from "next";
import { listPublishedCaseStudies } from "@/lib/mdxLoader";

/**
 * Sitemap.
 *
 * Routes are listed here rather than imported from src/lib/routes.mjs because that module
 * walks the filesystem at module scope, which is not safe inside the Next build graph.
 * The trade-off is a list that can drift — so `EXCLUDED` names every deliberate omission,
 * and `scripts/check-sitemap.mjs` fails the build if any public route is missing from
 * both. /about was silently absent for exactly this reason before that check existed.
 */

/**
 * Public routes deliberately kept OUT of the sitemap, with the reason.
 * Empty as of 2026-07-28: /design-system was made public portfolio content (TJ's call),
 * so every public route is now indexable. Keep the map — a future omission must be
 * documented here or scripts/check-sitemap.mjs fails the build.
 */
export const EXCLUDED: Record<string, string> = {};

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const studies = listPublishedCaseStudies();

  return [
    { url: base, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/case-studies`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/about`, changeFrequency: "yearly", priority: 0.6 },
    { url: `${base}/design-system`, changeFrequency: "monthly", priority: 0.6 },
    ...studies.map((s) => ({
      url: `${base}/case-studies/${s.slug}`,
      changeFrequency: "yearly" as const,
      priority: 0.7,
    })),
  ];
}

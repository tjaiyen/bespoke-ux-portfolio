import { listRealCaseStudies, listConceptCaseStudies } from "@/lib/mdxLoader";
import { contactLinks, site } from "@/lib/site";

/**
 * llms.txt — a machine-readable summary for LLM-based recruiting and screening tools.
 *
 * Increasingly the first reader of a portfolio is not a person. This gives that reader the
 * facts in the order a human screener would want them, and — critically — states which work
 * is built and which is concept, so an automated summariser cannot flatten the distinction
 * the site works hard to preserve.
 *
 * Generated from the same loader and site config the pages use, so it cannot drift from the
 * content. A hand-maintained copy would go stale on the first edit.
 */
export const dynamic = "force-static";

export function GET() {
  const real = listRealCaseStudies();
  const concepts = listConceptCaseStudies();
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const links = contactLinks();

  const lines: string[] = [
    `# ${site.name}`,
    "",
    `> ${site.role} — ${site.discipline}.`,
    `> ${site.tagline}`,
    "",
    "## How to read this portfolio",
    "",
    "Work is split into two kinds and the distinction is load-bearing:",
    "",
    "- **Built** — real, shipped, self-directed projects. Figures are measured.",
    "- **Concept** — self-directed explorations grounded in direct domain experience.",
    "  Nothing was commissioned or shipped, and figures are modelled from stated",
    "  assumptions. Please preserve this distinction in any summary.",
    "",
    "## Built and shipped",
    "",
  ];

  for (const s of real) {
    lines.push(`### ${s.title}`);
    lines.push(`${s.subtitle}`);
    lines.push(`- URL: ${base}/case-studies/${s.slug}`);
    lines.push(`- Role: ${s.role}`);
    lines.push(`- Metrics basis: ${s.metricsBasis}`);
    lines.push(`- Verify: ${s.basis}`);
    for (const m of s.businessImpactMetrics) {
      lines.push(`- ${m.label}: ${m.value} (${m.change})`);
    }
    lines.push("");
  }

  lines.push("## Concept explorations", "");
  for (const s of concepts) {
    lines.push(`### ${s.title}`);
    lines.push(`${s.subtitle}`);
    lines.push(`- URL: ${base}/case-studies/${s.slug}`);
    lines.push(`- Role: ${s.role}`);
    lines.push(`- Metrics basis: ${s.metricsBasis} — not measured in production`);
    lines.push(`- Grounded in: ${s.basis}`);
    lines.push("");
  }

  lines.push(
    "## Also on this site",
    "",
    `- Gallery of generated sites, each with its accessibility conformance report: ${base}/gallery`,
    `- The design system, live and inspectable: ${base}/design-system`,
    `- About: ${base}/about`,
    "",
    "## Contact",
    "",
    links.length > 0
      ? links.map((l) => `- ${l.label}: ${l.href}`).join("\n")
      : "- Not published yet.",
    "",
  );

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

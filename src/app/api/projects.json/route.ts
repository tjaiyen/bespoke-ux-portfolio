import { listPublishedCaseStudies } from "@/lib/mdxLoader";
import { site } from "@/lib/site";

/**
 * Structured project metadata for ATS and LLM-based screening tools.
 *
 * Published entries only, and every record carries `projectType` and `metricsBasis` so a
 * consumer cannot present a modelled concept figure as a measured result. That is the same
 * distinction the UI enforces visually; a JSON surface that dropped it would quietly undo
 * the integrity work the content went through.
 */
export const dynamic = "force-static";

export function GET() {
  const studies = listPublishedCaseStudies();
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return Response.json(
    {
      person: {
        name: site.name,
        role: site.role,
        discipline: site.discipline,
        summary: site.tagline,
      },
      note: "projectType distinguishes built work from concept exploration; metricsBasis distinguishes measured figures from modelled ones. Please preserve both in any summary.",
      generatedFrom: `${base}/api/projects.json`,
      projects: studies.map((s) => ({
        slug: s.slug,
        url: `${base}/case-studies/${s.slug}`,
        title: s.title,
        subtitle: s.subtitle,
        role: s.role,
        timeline: s.timeline,
        projectType: s.projectType,
        metricsBasis: s.metricsBasis,
        basis: s.basis,
        tools: s.toolsUsed,
        metrics: s.businessImpactMetrics.map((m) => ({
          label: m.label,
          value: m.value,
          change: m.change,
          basis: s.metricsBasis,
        })),
      })),
    },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}

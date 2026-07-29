import { contactLinks, site } from "@/lib/site";

/**
 * Structured data for search and AI screening tools.
 *
 * `sameAs` only lists profile URLs that are actually configured — emitting an empty or
 * placeholder identity would be worse than emitting none, because structured data is
 * consumed without a human sanity-checking it.
 */
export function PersonJsonLd() {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const sameAs = contactLinks()
    .filter((l) => l.href.startsWith("http"))
    .map((l) => l.href);

  const data = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: site.name,
    jobTitle: site.role,
    description: site.tagline,
    knowsAbout: site.discipline.split(" · "),
    url: base,
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** One CreativeWork per case study. `abstract` carries the built/concept distinction. */
export function CaseStudyJsonLd({
  title,
  subtitle,
  slug,
  projectType,
  metricsBasis,
}: {
  title: string;
  subtitle: string;
  slug: string;
  projectType: string;
  metricsBasis: string;
}) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const data = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: title,
    description: subtitle,
    url: `${base}/case-studies/${slug}`,
    author: { "@type": "Person", name: site.name },
    creativeWorkStatus:
      projectType === "concept" ? "Concept exploration" : "Built and shipped",
    abstract:
      projectType === "concept"
        ? `Self-directed concept. Not commissioned or shipped; figures are ${metricsBasis} from stated assumptions.`
        : `Self-directed built work. Figures are ${metricsBasis}.`,
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

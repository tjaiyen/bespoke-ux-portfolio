import { listPublishedCaseStudies } from "./mdxLoader";
import type { CaseStudyFrontmatter } from "./caseStudySchema";

export type Evidence = {
  slug: string;
  studyTitle: string;
  /** e.g. "14 days" */
  from: string;
  /** e.g. "3 days" */
  to: string;
  label: string;
};

/**
 * Metrics eligible for the home-page evidence strip.
 *
 * SELECTION IS MECHANICAL, NOT CURATED (plan stress-test finding P1).
 *
 * The recruiter critique's top portfolio-wide fix was unsourced metrics, and 2 of the 3
 * studies contain no sourcing language at all. Promoting an unsourced figure to the first
 * thing a screener reads would maximise exposure to the one criticism the portfolio has
 * already received.
 *
 * So the strip only admits a metric whose `change` field states an explicit numeric
 * before→after ("from 14 to 3 days", "from 5 days to 20 min"). Those are self-evidencing:
 * the baseline travels with the claim, so the reader can judge it without prose. Survey-
 * and estimate-derived figures ("+34pp on quarterly stakeholder survey") stay inside their
 * case studies where surrounding text can qualify them.
 *
 * A rule beats taste here — it cannot drift, and when a metric gains a real source the
 * fix is to write the source, not to lobby for inclusion.
 */
/**
 * The unit on each side is OPTIONAL.
 *
 * An earlier form required a trailing word character (`[\d.,]+\s*\w+?`), which silently
 * excluded a single-digit before-value: "from 9 to 5 hrs" never matched, because the
 * lazy `\w+?` had nothing to consume after "9" and the whole alternative failed. Two-digit
 * values only worked by accident — "14" satisfied it as "1" + "4". A rule that silently
 * drops a legitimately-sourced metric is the same class of failure as the unsourced
 * metrics it exists to keep out.
 */
const FROM_TO = /from\s+([\d.,]+(?:\s*[a-z%$]+)?)\s+to\s+([\d.,]+(?:\s*[a-z%$]+)?)/i;

function firstSourcedMetric(study: CaseStudyFrontmatter): Evidence | null {
  for (const m of study.businessImpactMetrics) {
    const match = FROM_TO.exec(m.change);
    if (!match) continue;
    return {
      slug: study.slug,
      studyTitle: study.title,
      from: match[1].trim(),
      to: match[2].trim(),
      label: m.label,
    };
  }
  return null;
}

/** One self-evidencing metric per published study, in publication order. */
export function evidenceStrip(): Evidence[] {
  return listPublishedCaseStudies()
    .map(firstSourcedMetric)
    .filter((e): e is Evidence => e !== null);
}

/** The evidence for one study, or null when none of its metrics is self-evidencing. */
export function evidenceFor(slug: string): Evidence | null {
  return evidenceStrip().find((e) => e.slug === slug) ?? null;
}

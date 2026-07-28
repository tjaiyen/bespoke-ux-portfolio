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
const FROM_TO = /from\s+([\d.,]+\s*\w+?)\s+to\s+([\d.,]+\s*\w+)/i;

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

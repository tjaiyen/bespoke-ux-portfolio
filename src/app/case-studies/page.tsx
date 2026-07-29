import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  listRealCaseStudies,
  listConceptCaseStudies,
  type CaseStudyFrontmatterList,
} from "@/lib/mdxLoader";
import { ConceptBadge } from "@/components/site/ProjectTypeNotice";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Enterprise B2B, manufacturing operations, and financial systems design work.",
};

export default function CaseStudiesIndexPage() {
  const real = listRealCaseStudies();
  const concepts = listConceptCaseStudies();

  return (
    <main id="main-content" className="mx-auto w-full max-w-4xl px-6 py-16">
      <h1 className="font-serif text-4xl leading-tight text-text-main">Work</h1>
      <p className="mt-4 max-w-2xl font-sans text-lg text-text-muted">
        Work at the seam between financial data and plant-floor operations. Built
        work comes first; concept explorations follow, labelled as such.
      </p>

      {real.length === 0 && concepts.length === 0 && (
        <p className="mt-10 font-sans text-text-muted">
          No published case studies yet.
        </p>
      )}

      <section aria-labelledby="real-heading" className="mt-12">
        <h2 id="real-heading" className="font-serif text-2xl text-text-main">
          Built and shipped
        </h2>
        <p className="mt-2 max-w-2xl font-sans text-sm text-text-muted">
          Real work with measured results. Open the gallery to verify the output yourself.
        </p>
        {renderCards(real)}
      </section>

      {concepts.length > 0 && (
        <section aria-labelledby="concept-heading" className="mt-20">
          <h2 id="concept-heading" className="font-serif text-2xl text-text-main">
            Concept explorations
          </h2>
          <p className="mt-2 max-w-2xl font-sans text-sm text-text-muted">
            Self-directed concepts grounded in direct domain experience. Nothing here was
            commissioned or shipped, and the figures are modelled from stated assumptions —
            each study says so before it says anything else.
          </p>
          {renderCards(concepts)}
        </section>
      )}
    </main>
  );
}

function renderCards(items: CaseStudyFrontmatterList) {
  return (
    <ul className="mt-8 space-y-10">
          {items.map((study) => (
            <li key={study.slug}>
              {/* Whole card is one link: a bigger target than a text-only heading
                  link, and one tab stop per study rather than several. */}
              <Link
                href={`/case-studies/${study.slug}`}
                className="group grid grid-cols-1 gap-6 rounded-lg border border-border-subtle bg-bg-surface p-5 focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none sm:grid-cols-[200px_1fr]"
              >
                <Image
                  src={study.heroImage}
                  alt=""
                  width={1600}
                  height={900}
                  className="h-32 w-full rounded object-cover sm:h-full"
                />
                <div>
                  <ConceptBadge projectType={study.projectType} />
                  <h2 className="mt-2 font-serif text-2xl leading-snug text-text-main group-hover:underline group-hover:underline-offset-4">
                    {study.title}
                  </h2>
                  <p className="mt-2 font-sans text-text-muted">
                    {study.subtitle}
                  </p>

                  {/* Lead metric surfaced on the card — "context and impact
                      quantification" is the first dimension hiring teams check,
                      and it should not require a click to see. */}
                  {study.businessImpactMetrics[0] && (
                    <p className="mt-4 font-mono text-sm text-text-main">
                      <span className="text-status-positive">
                        {study.businessImpactMetrics[0].value}
                      </span>{" "}
                      <span className="text-text-muted">
                        {study.businessImpactMetrics[0].label}
                      </span>
                    </p>
                  )}

                  <p className="mt-3 font-mono text-xs text-text-muted">
                    {study.role} · {study.timeline}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
  );
}

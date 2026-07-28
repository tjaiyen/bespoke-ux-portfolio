import Link from "next/link";
import Image from "next/image";
import { listPublishedCaseStudies } from "@/lib/mdxLoader";
import { evidenceStrip } from "@/lib/evidence";
import { site } from "@/lib/site";
import { ConceptBadge } from "@/components/site/ProjectTypeNotice";

const APPROACH = [
  {
    title: "Research that contradicts the brief",
    body: "Shadowing people during the actual task, not interviewing them about it afterwards. The findings are only worth having if they can change the plan.",
  },
  {
    title: "Trade-offs with a stated cost",
    body: "Every case study names a direction I discarded and what accepting the alternative cost. A trade-off with no cost usually means nothing was traded.",
  },
  {
    title: "Built, not just specified",
    body: "This site is hand-built against a semantic token system, with contrast, keyboard and accessibility checks running in CI rather than asserted in prose.",
  },
];

export default function Home() {
  const studies = listPublishedCaseStudies();
  const evidence = evidenceStrip();

  return (
    <main id="main-content">
      {/* ---- Hero: domain and positioning, no imagery ------------------------
          Deliberately typographic. The hero images are generated placeholders,
          and putting them in the first viewport would amplify the portfolio's
          weakest asset (plan stress-test P3). It would also add an above-fold
          image to the LCP path, which is already the binding perf constraint. */}
      <section className="mx-auto w-full max-w-4xl px-6 pt-16 pb-10">
        <h1 className="max-w-3xl font-serif text-4xl leading-[1.15] text-text-main sm:text-5xl">
          Product design for enterprise operations
        </h1>
        <p className="mt-5 max-w-2xl font-sans text-lg leading-relaxed text-text-muted">
          {site.tagline}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/case-studies"
            className="inline-flex min-h-11 items-center rounded-md bg-accent-brand px-6 font-sans text-bg-surface focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none"
          >
            View work
          </Link>
          <Link
            href="/about"
            className="inline-flex min-h-11 items-center rounded-md border border-border-subtle px-6 font-sans text-text-main focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none"
          >
            About
          </Link>
        </div>
      </section>

      {/* ---- Evidence strip --------------------------------------------------
          Answers the core problem: the entry page previously made a claim and
          showed no evidence for it. Every figure here states its own before and
          after, so the baseline travels with the claim (selection rule in
          src/lib/evidence.ts). Each links to the study it came from. */}
      {evidence.length > 0 && (
        <section
          aria-labelledby="evidence-heading"
          className="border-y border-border-subtle bg-bg-surface"
        >
          <div className="mx-auto w-full max-w-4xl px-6 py-8">
            <h2
              id="evidence-heading"
              className="font-mono text-[11px] tracking-widest text-text-muted uppercase"
            >
              Modelled outcomes
            </h2>
            <p className="mt-2 font-sans text-sm text-text-muted">
              Concept projects. Figures are modelled from stated assumptions, not
              measured in production — each links to the reasoning behind it.
            </p>
            <ul className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
              {evidence.map((e) => (
                <li key={e.slug}>
                  <Link
                    href={`/case-studies/${e.slug}`}
                    className="group block rounded focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none"
                  >
                    <span className="flex items-baseline gap-2 font-mono text-xl text-text-main">
                      <span className="text-text-muted line-through decoration-1">
                        {e.from}
                      </span>
                      <span aria-hidden="true" className="text-text-muted">
                        →
                      </span>
                      <span className="text-status-positive">{e.to}</span>
                    </span>
                    <span className="mt-1 block font-sans text-sm text-text-main group-hover:underline group-hover:underline-offset-4">
                      {e.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ---- Selected work (below the fold by design) ----------------------- */}
      <section
        aria-labelledby="work-heading"
        className="mx-auto w-full max-w-4xl px-6 py-16"
      >
        <div className="flex items-baseline justify-between gap-4">
          <h2
            id="work-heading"
            className="font-serif text-3xl text-text-main"
          >
            Selected work
          </h2>
          <Link
            href="/case-studies"
            className="inline-flex min-h-11 items-center font-sans text-sm text-text-muted underline-offset-4 hover:text-text-main hover:underline focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none"
          >
            All work →
          </Link>
        </div>

        <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {studies.map((study) => (
            <li key={study.slug}>
              <Link
                href={`/case-studies/${study.slug}`}
                className="group flex h-full flex-col rounded-lg border border-border-subtle bg-bg-surface focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none"
              >
                <Image
                  src={study.heroImage}
                  alt=""
                  width={1600}
                  height={900}
                  className="h-36 w-full rounded-t-lg object-cover"
                />
                <span className="flex flex-1 flex-col p-5">
                  <span className="mb-2 block">
                    <ConceptBadge projectType={study.projectType} />
                  </span>
                  <span className="font-serif text-lg leading-snug text-text-main group-hover:underline group-hover:underline-offset-4">
                    {study.title}
                  </span>
                  <span className="mt-2 font-sans text-sm text-text-muted">
                    {study.subtitle}
                  </span>
                  <span className="mt-auto pt-4 font-mono text-xs text-text-muted">
                    {study.timeline}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ---- Approach ------------------------------------------------------- */}
      <section
        aria-labelledby="approach-heading"
        className="border-t border-border-subtle"
      >
        <div className="mx-auto w-full max-w-4xl px-6 py-16">
          <h2
            id="approach-heading"
            className="font-serif text-3xl text-text-main"
          >
            How I work
          </h2>
          <dl className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {APPROACH.map((a) => (
              <div key={a.title}>
                <dt className="font-serif text-lg text-text-main">{a.title}</dt>
                <dd className="mt-2 font-sans text-sm leading-relaxed text-text-muted">
                  {a.body}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";
import Image from "next/image";
import { listRealCaseStudies, listConceptCaseStudies } from "@/lib/mdxLoader";
import { evidenceStrip } from "@/lib/evidence";
import { site } from "@/lib/site";
import { ConceptBadge } from "@/components/site/ProjectTypeNotice";
import { Act, Interlude } from "@/components/site/Act";
import VarianceStage from "@/components/stage/VarianceStage";
import { assetPath } from "@/lib/assetPath";

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

/**
 * The home page is a journey in five acts over a fixed WebGL stage.
 *
 * The stage renders "variance settling" — a bundle of drifting traces that converge into
 * one signal as you scroll — which is the portfolio's own subject as its backdrop. The
 * acts are opaque panels floating above it, and the interlude bands between them carry no
 * text at all, so the scene has stretches of the page it owns outright. That division is
 * not decoration: it is what lets a contrast audit computed from flat token values stay
 * valid with a canvas underneath.
 */
export default function Home() {
  const real = listRealCaseStudies();
  const concepts = listConceptCaseStudies();
  const evidence = evidenceStrip();

  return (
    <>
      <VarianceStage />
      {/* Reading progress. Purely decorative and CSS-only; renders nothing at all in a
          browser without scroll-driven animations. */}
      <div aria-hidden="true" className="scroll-rail" />

      <main
        id="main-content"
        className="flex flex-col gap-12 py-10 sm:gap-20 sm:py-16"
      >
        <Act
          numeral="I"
          kicker="Where I work"
          title="Product design for enterprise operations"
          id="act-brief"
          heading="h1"
          reveal={false}
        >
          <p className="measure font-sans text-lg leading-relaxed text-text-muted">
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
        </Act>

        <Interlude />

        {/* The verifiable half, ahead of the modelled figures. */}
        {real.length > 0 && (
          <Act
            numeral="II"
            kicker="Built and shipped"
            title="Work you can run yourself"
            id="act-built"
            tone="surface"
          >
            <ul className="space-y-5">
              {real.map((study) => (
                <li key={study.slug}>
                  <Link
                    href={`/case-studies/${study.slug}`}
                    className="group block rounded focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none"
                  >
                    <span className="block font-serif text-xl text-text-main group-hover:underline group-hover:underline-offset-4">
                      {study.title}
                    </span>
                    <span className="measure mt-1 block font-sans text-sm text-text-muted">
                      {study.subtitle}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="measure mt-6 font-sans text-sm text-text-muted">
              All 47 sites are published here with their conformance
              reports —{" "}
              <Link
                href="/gallery"
                className="text-accent-brand underline underline-offset-4"
              >
                open the gallery
              </Link>{" "}
              and check the receipts yourself.
            </p>
          </Act>
        )}

        {/* Every figure states its own before and after, so the baseline travels with the
            claim (selection rule in src/lib/evidence.ts). */}
        {evidence.length > 0 && (
          <Act
            numeral="III"
            kicker="Modelled, not measured"
            title="What the concept work projects"
            id="act-evidence"
          >
            <p className="measure font-sans text-sm text-text-muted">
              These three are <strong>modelled</strong> from stated assumptions, not
              measured. The built work above carries measured figures — the distinction is
              deliberate and is marked on every card.
            </p>
            <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
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
          </Act>
        )}

        <Interlude />

        <Act
          numeral="IV"
          kicker="The full set"
          title="Selected work"
          id="act-work"
          tone="surface"
        >
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[...real, ...concepts].map((study) => (
              <li key={study.slug}>
                <Link
                  href={`/case-studies/${study.slug}`}
                  className="group flex h-full flex-col rounded-lg border border-border-subtle bg-bg-app focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none"
                >
                  <Image
                    src={assetPath(study.heroImage)}
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
          <p className="mt-8">
            <Link
              href="/case-studies"
              className="inline-flex min-h-11 items-center font-sans text-sm text-text-muted underline-offset-4 hover:text-text-main hover:underline focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none"
            >
              All work →
            </Link>
          </p>
        </Act>

        <Act numeral="V" kicker="Method" title="How I work" id="act-approach">
          <dl className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {APPROACH.map((a) => (
              <div key={a.title}>
                <dt className="font-serif text-lg text-text-main">{a.title}</dt>
                <dd className="mt-2 font-sans text-sm leading-relaxed text-text-muted">
                  {a.body}
                </dd>
              </div>
            ))}
          </dl>
        </Act>

        {/* The finale. The scene has been converging for the whole page; this is the
            band where it is fully settled and has the canvas to itself. Without it the
            payoff lands behind the footer, which is the one place nobody looks. */}
        <Interlude />
      </main>
    </>
  );
}

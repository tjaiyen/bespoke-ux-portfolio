import type { Metadata } from "next";
import Link from "next/link";
import { contactLinks, site } from "@/lib/site";
import VarianceStage from "@/components/stage/VarianceStage";
import { listRealCaseStudies, listConceptCaseStudies } from "@/lib/mdxLoader";

export const metadata: Metadata = {
  title: "About",
  description: site.tagline,
};

// Spelled out in prose rather than digits, matching "Twenty-six deterministic finance
// tools" elsewhere on the site. Small, closed range — a case-study count in the tens
// would read oddly spelled out anyway, so this isn't trying to generalise further.
const SMALL_NUMBER_WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
];
function spellOut(n: number): string {
  return SMALL_NUMBER_WORDS[n] ?? String(n);
}

const FOCUS = [
  {
    heading: "Enterprise B2B",
    body: "Internal tools with real operational stakes — where the user is an expert doing a job under time pressure, not a consumer being persuaded.",
  },
  {
    heading: "Manufacturing operations",
    body: "Plant-floor visibility and ERP data. Work orders, routings, work centers, shift-level detail — the layer where cost is actually incurred.",
  },
  {
    heading: "Financial systems",
    body: "Costing, variance, margin, and CapEx. Making the numbers traceable to the decisions that produced them.",
  },
];

export default function AboutPage() {
  const links = contactLinks();
  const builtCount = listRealCaseStudies().length;
  const conceptCount = listConceptCaseStudies().length;

  return (
    <>
      <VarianceStage />
      <main
        id="main-content"
        className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16"
      >
        {/* One opaque panel holding the whole read. About carries the stage but not the
            act structure — it is a page you read, not a journey you are taken through —
            and the panel is what keeps this prose off the canvas. */}
        <div className="rounded-xl border border-border-subtle bg-bg-app p-6 shadow-xl shadow-black/5 sm:p-10">
          <h1 className="act-title act-title-lead font-serif text-text-main">
            About
          </h1>

          <div className="prose-case mt-8">
            <p>
              I&rsquo;m {site.name}, a product designer working in enterprise B2B,
              manufacturing operations, and financial systems. Before design I spent
              my career as a{" "}
              <strong>cost accountant in manufacturing</strong> — closing the books,
              chasing variances, and building the spreadsheets that plant controllers
              actually ran on.
            </p>
            <p>
              That background is the whole point. I already know what a work-order
              variance is, why it matters that it surfaced at month-end instead of on
              the day it happened, and what a controller does at 7pm during close
              week. I don&rsquo;t need a domain expert to translate the problem for
              me — I was the domain expert. What I do now is make that world legible
              to the people who have to operate in it.
            </p>
            <p>
              The work in this portfolio is not generic SaaS redesign. It is
              ERP-adjacent tooling where a wrong number has a cost, the users are
              specialists, and the measure of a good design is whether it changed how
              a real operation runs.
            </p>
            <p>
              <strong>To be direct about where I am:</strong> this is a deliberate
              move from finance into designing and building the tools finance runs
              on, and I am early in it. I have not held a product-design title. What
              I have is the domain most design candidates spend their first year
              trying to learn, and {spellOut(builtCount)} projects on this site are
              actually built, shipped and independently verifiable — open the live
              dashboard or gallery receipt for any of them, or, for the finance data
              pipeline, clone the repo and reproduce the numbers yourself in about a
              minute. The other {spellOut(conceptCount)} are concept studies, labelled
              as concepts on every card, and each one states what it assumes and what
              would prove it wrong.
            </p>
            <p>
              I would rather be judged on that than on a job title I do not have yet.
            </p>
          </div>

          <h2 className="mt-14 font-serif text-2xl text-text-main">Where I focus</h2>
          <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {FOCUS.map((f) => (
              <div
                key={f.heading}
                className="rounded-lg border border-border-subtle bg-bg-surface p-5"
              >
                <dt className="font-serif text-lg text-text-main">{f.heading}</dt>
                <dd className="mt-2 font-sans text-sm leading-relaxed text-text-muted">
                  {f.body}
                </dd>
              </div>
            ))}
          </dl>

          <h2 className="mt-14 font-serif text-2xl text-text-main">How I work</h2>
          <div className="prose-case mt-4">
            <p>
              Domain first. I am not translating a field I learned about — I am
              designing for the one I worked in, which means the problem definition
              starts from having done the job rather than from a discovery phase. Then
              the trade-off gets written down: what I discarded, on what criteria, and
              what it cost, because a design decision with no stated cost usually means
              the alternative was never seriously considered. Where a concept rests on an
              assumption rather than evidence, it says so and names what would falsify it.
            </p>
            <p>
              This site is built the same way it argues for: hand-built in Next.js
              and TypeScript against a semantic design-token system, WCAG 2.1 AA
              throughout, with the accessibility and contrast checks running in CI
              rather than asserted in prose. The{" "}
              <Link href="/design-system">design system</Link> is inspectable — the
              backdrop on this page included.
            </p>
          </div>

          <h2 className="mt-14 font-serif text-2xl text-text-main">
            Working with other people, and with machines
          </h2>
          <div className="prose-case mt-4">
            <p>
              Cost accounting is not a solitary job, whatever its reputation. A close
              is a negotiation: with plant managers about why a work order overran,
              with operations about whether a variance is real or a timing artefact,
              with IT about what the ERP will and will not give you. Most of the
              useful work is getting people who measure different things to agree on
              one number they will both sign.
            </p>
            <p>
              The newer version of that is working alongside AI, and I have taken a
              specific position on it that runs through everything here.{" "}
              <strong>
                My subject is not using AI to produce work — it is designing the
                constraints that make AI output trustworthy.
              </strong>{" "}
              The{" "}
              <Link href="/case-studies/accessibility-gate-for-generated-ui">
                accessibility gate
              </Link>{" "}
              exists because a generator will satisfy the letter of a check and miss
              its purpose, so finishing had to become conditional on proof. The{" "}
              <Link href="/case-studies/finance-data-pipeline-and-agent">
                variance agent
              </Link>{" "}
              exists because a language model near a ledger produces answers nobody
              can audit, so it writes prose over numbers it cannot alter and its
              output is rejected if it references an account that does not exist or
              omits a variance that mattered.
            </p>
            <p>
              This site is held to the same standard. The build refuses to complete
              if a concept study claims research that did not happen, if a
              conformance receipt does not match the bytes being served, or if the
              published pages carry a link that resolves to nothing. Those gates
              exist because each of them caught me — they are not decoration, they
              are scar tissue.
            </p>
          </div>

          <section
            aria-labelledby="contact-heading"
            className="mt-16 rounded-lg border border-border-subtle bg-bg-surface p-8"
          >
            <h2 id="contact-heading" className="font-serif text-2xl text-text-main">
              Get in touch
            </h2>
            {links.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-3">
                {links.map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      className="flex min-h-11 items-center rounded-md bg-accent-brand px-5 font-sans text-sm text-bg-surface focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 font-sans text-sm text-text-muted">
                Contact details are not published yet — add them in{" "}
                <code className="font-mono text-xs">src/lib/site.ts</code>.
              </p>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

import Link from "next/link";
import dynamic from "next/dynamic";
import Reveal from "@/components/motion/Reveal";
import { listPublishedCaseStudies } from "@/lib/mdxLoader";

// The token inspector is the proof-of-craft piece the design rules call for on the home
// page: the design system inspects itself. Lazy-loaded with a fixed-height placeholder
// so it never costs initial JS and never shifts layout on arrival.
const DesignTokenInspector = dynamic(
  () => import("@/components/widgets/DesignTokenInspector"),
  {
    loading: () => (
      <div
        className="h-96 animate-pulse rounded bg-bg-surface"
        aria-hidden="true"
      />
    ),
  },
);

export default function Home() {
  const studies = listPublishedCaseStudies();

  return (
    <>
      {/* WCAG 2.4.1 Bypass Blocks — first focusable element on the page. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:bg-bg-surface focus:px-4 focus:py-3 focus:text-text-main focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none"
      >
        Skip to main content
      </a>

      <main id="main-content" className="mx-auto w-full max-w-4xl px-6 py-20">
        <Reveal>
          <h1 className="font-serif text-5xl leading-tight text-text-main">
            Product design for enterprise operations
          </h1>
          <p className="mt-5 max-w-2xl font-sans text-lg text-text-muted">
            Enterprise B2B, manufacturing operations, and financial systems. A
            former manufacturing cost accountant turning ERP and financial data
            into real-time operational visibility tools.
          </p>
        </Reveal>

        <Reveal index={1} className="mt-10">
          <Link
            href="/case-studies"
            className="inline-flex min-h-11 items-center rounded-md bg-accent-brand px-6 font-sans text-bg-surface focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none"
          >
            View case studies
            {studies.length > 0 ? ` (${studies.length})` : ""}
          </Link>
        </Reveal>

        <Reveal index={2} className="mt-20">
          <h2 className="font-serif text-3xl text-text-main">
            The design system, live
          </h2>
          <p className="mt-3 max-w-2xl font-sans text-text-muted">
            Every color below is read from the same CSS custom properties the
            components use — switch the mode and the values re-resolve. Nothing
            here is a hardcoded swatch.
          </p>
        </Reveal>

        <Reveal index={3}>
          <DesignTokenInspector />
        </Reveal>
      </main>
    </>
  );
}

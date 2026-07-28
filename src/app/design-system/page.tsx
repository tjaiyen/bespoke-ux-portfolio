import type { Metadata } from "next";
import Link from "next/link";
import MetricsGrid from "@/components/widgets/MetricsGrid";
import BeforeAfterSlider from "@/components/widgets/BeforeAfterSlider";
import DesignTokenInspector from "@/components/widgets/DesignTokenInspector";
import FlowChartSimulator from "@/components/widgets/FlowChartSimulator";

// PUBLIC page (TJ's decision, 2026-07-28). This began as an internal verification
// harness; it is now portfolio content — the "interactive proof-of-craft" evaluation
// dimension, shown rather than claimed.
//
// Components are imported statically here on purpose. This page's job is to display the
// whole system at once, so lazy-loading each piece would only add loading states with no
// benefit; the MDX registry (src/lib/mdxComponents.tsx) is where next/dynamic applies,
// because there the widgets sit inside long articles and must not cost initial JS.
export const metadata: Metadata = {
  title: "Design System",
  description:
    "The semantic token system, typography, and interactive components this portfolio is built from — inspectable and live.",
};

const SAMPLE_METRICS = [
  { label: "Close Cycle Time", value: "4.2 days", change: "-2.8 days", isPositive: true },
  { label: "Variance Detected Pre-Close", value: "87%", change: "+41 pts", isPositive: true },
  { label: "Manual Reconciliation Hours", value: "12/mo", change: "-31/mo", isPositive: true },
];

const SAMPLE_FLOW = [
  {
    id: "detect",
    label: "Variance surfaces in the daily feed",
    detail:
      "Cost variance crosses the configured threshold and appears on the plant controller's dashboard the morning it occurs, rather than at month-end close.",
    decision:
      "Threshold is per-facility, not global — a shared threshold buried small-plant signals under large-plant noise.",
  },
  {
    id: "triage",
    label: "Controller opens the itemized drawer",
    detail:
      "Summary card expands into line-level COGS and labor detail without leaving the page context.",
    decision:
      "Slide-over instead of a route change: navigating away lost the comparison set that made the variance legible.",
  },
  {
    id: "attribute",
    label: "Cause is attributed to a work center",
    detail:
      "The drawer groups variance by work center and shift so the controller can hand a specific question to a specific supervisor.",
  },
  {
    id: "resolve",
    label: "Action is logged against the variance",
    detail:
      "Resolution notes attach to the variance record, so the next month's review starts from what was already tried.",
  },
];

export default function DesignSystemPage() {
  return (
    <main id="main-content" className="mx-auto w-full max-w-4xl px-6 py-16">
      <h1 className="font-serif text-4xl leading-tight text-text-main">
        Design system
      </h1>
      <p className="mt-4 max-w-2xl font-sans text-lg text-text-muted">
        This portfolio is built on a semantic token system rather than ad-hoc
        styling. Every colour below is read live from the same CSS custom
        properties the components use — switch the mode and the values re-resolve.
      </p>
      <p className="mt-4 max-w-2xl font-sans text-text-muted">
        Contrast is verified in CI across all 32 token pairs in both themes, and
        keyboard, focus, and target-size checks run against every route at three
        viewports. The components below are the shared set; the domain-specific
        widgets — variance simulators, BOM breadcrumbs, approval panels — live
        inside the{" "}
        <Link
          href="/case-studies"
          className="text-accent-brand underline underline-offset-4"
        >
          case studies
        </Link>{" "}
        they were built for. Figures shown here are illustrative.
      </p>

      <section aria-labelledby="ds-metrics" className="mt-12">
        <h2 id="ds-metrics" className="font-serif text-2xl text-text-main">
          MetricsGrid
        </h2>
        <MetricsGrid metrics={SAMPLE_METRICS} label="Sample impact metrics" />
      </section>

      <section aria-labelledby="ds-slider" className="mt-12">
        <h2 id="ds-slider" className="font-serif text-2xl text-text-main">
          BeforeAfterSlider
        </h2>
        <BeforeAfterSlider
          beforeImage="/images/_design-system/before.png"
          afterImage="/images/_design-system/after.png"
          beforeAlt="A dense report where every row carries equal visual weight, so no exception stands out."
          afterAlt="The same data summarised into three ranked cards, with the largest variance highlighted as an exception."
          caption="Comparison component. Drag the control, or focus it and use the arrow keys, to move between states."
        />
      </section>

      <section aria-labelledby="ds-flow" className="mt-12">
        <h2 id="ds-flow" className="font-serif text-2xl text-text-main">
          FlowChartSimulator
        </h2>
        <FlowChartSimulator
          steps={SAMPLE_FLOW}
          label="Sample variance triage flow"
        />
      </section>

      <section aria-labelledby="ds-tokens" className="mt-12">
        <h2 id="ds-tokens" className="font-serif text-2xl text-text-main">
          DesignTokenInspector
        </h2>
        <DesignTokenInspector />
      </section>
    </main>
  );
}

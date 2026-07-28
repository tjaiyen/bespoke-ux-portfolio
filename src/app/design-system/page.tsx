import type { Metadata } from "next";
import MetricsGrid from "@/components/widgets/MetricsGrid";
import BeforeAfterSlider from "@/components/widgets/BeforeAfterSlider";
import DesignTokenInspector from "@/components/widgets/DesignTokenInspector";
import FlowChartSimulator from "@/components/widgets/FlowChartSimulator";

// Widget harness. Until case studies exist there is nowhere to render the shared widgets,
// which means nowhere to verify them at 375 / 768 / 1280. This route is that surface:
// every shared widget on one page, exercised with representative props.
//
// Imported directly rather than through next/dynamic — this page is a verification
// surface, not a performance-budgeted route, and static imports keep what is under test
// unambiguous. The MDX registry (src/lib/mdxComponents.tsx) is where lazy-loading applies.
//
// noindex: this is scaffolding, not portfolio content.
export const metadata: Metadata = {
  title: "Design System",
  description: "Internal widget and token verification surface.",
  robots: { index: false, follow: false },
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
      <h1 className="font-serif text-4xl text-text-main">Design system</h1>
      <p className="mt-3 font-sans text-text-muted">
        Verification surface for the four shared widgets. Sample props are
        illustrative placeholders, not case-study data.
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
          beforeAlt="Placeholder standing in for a legacy-state screenshot."
          afterAlt="Placeholder standing in for a redesigned-state screenshot."
          caption="Drag the control, or focus it and use the arrow keys, to compare states."
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

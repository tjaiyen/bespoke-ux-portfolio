import dynamic from "next/dynamic";

// Widgets are heavy and interactive: lazy-imported via next/dynamic and handed to
// compileMDX through the `components` option, so MDX authors write <MetricsGrid />
// while initial JS stays under 100KB.
//
// Loading placeholders carry FIXED dimensions — a placeholder that resizes when the
// real widget arrives is a layout shift, and CLS = 0 is a hard CI gate.
//
// Phase 2 registers only MetricsGrid: it is fed directly by validated frontmatter, so
// it exercises the full registry path end-to-end. BeforeAfterSlider,
// DesignTokenInspector, FlowChartSimulator, and the seven project-specific widgets are
// Phase 3 — registering a dynamic import for a file that does not exist fails the
// build, so they are added alongside their implementations, not ahead of them.
const MetricsGrid = dynamic(() => import("@/components/widgets/MetricsGrid"), {
  loading: () => (
    <div
      className="h-32 animate-pulse rounded bg-bg-surface"
      aria-hidden="true"
    />
  ),
});

export const mdxComponents = {
  MetricsGrid,
};

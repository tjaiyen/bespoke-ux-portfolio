import dynamic from "next/dynamic";

// Widgets are heavy and interactive: lazy-imported via next/dynamic and handed to
// evaluate() through the `components` option, so MDX authors write <MetricsGrid />
// while initial JS stays under 100KB.
//
// Loading placeholders carry FIXED dimensions — a placeholder that resizes when the
// real widget arrives is a layout shift, and CLS = 0 is a hard CI gate.
//
// The four SHARED widgets are registered here. The seven PROJECT widgets
// (SummaryKpiGrid, ItemizedDrawer, InteractiveVarianceSimulator, BomBreadcrumbFocus,
// MarginCascadeSlider, CollaborativeApprovalPanel, DualViewMatrixTable) are deliberately
// NOT built yet: each exists to illustrate a specific beat in a case study that has not
// been written. Building them first is risk S4 (over-engineering ahead of narrative) and
// inverts the 70/30 rule. They land with the case studies they serve.
//
// Using an unregistered component in MDX fails the build — intended, not a bug.

const skeleton = (height: string) =>
  function Skeleton() {
    return (
      <div
        className={`${height} animate-pulse rounded bg-bg-surface`}
        aria-hidden="true"
      />
    );
  };

const MetricsGrid = dynamic(() => import("@/components/widgets/MetricsGrid"), {
  loading: skeleton("h-32"),
});

const BeforeAfterSlider = dynamic(
  () => import("@/components/widgets/BeforeAfterSlider"),
  { loading: skeleton("h-96") },
);

const DesignTokenInspector = dynamic(
  () => import("@/components/widgets/DesignTokenInspector"),
  { loading: skeleton("h-96") },
);

const FlowChartSimulator = dynamic(
  () => import("@/components/widgets/FlowChartSimulator"),
  { loading: skeleton("h-64") },
);

export const mdxComponents = {
  MetricsGrid,
  BeforeAfterSlider,
  DesignTokenInspector,
  FlowChartSimulator,
};

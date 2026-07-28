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
// MarginCascadeSlider, CollaborativeApprovalPanel, DualViewMatrixTable) now live with
// the case studies they serve.
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

// Project-specific widgets — each illustrates a beat in its case study.
// Lazy-loaded with fixed-height skeletons to preserve CLS = 0.

const SummaryKpiGrid = dynamic(
  () => import("@/components/widgets/SummaryKpiGrid"),
  { loading: skeleton("h-28") },
);

const ItemizedDrawer = dynamic(
  () => import("@/components/widgets/ItemizedDrawer"),
  { loading: skeleton("h-64") },
);

const InteractiveVarianceSimulator = dynamic(
  () => import("@/components/widgets/InteractiveVarianceSimulator"),
  { loading: skeleton("h-80") },
);

const BomBreadcrumbFocus = dynamic(
  () => import("@/components/widgets/BomBreadcrumbFocus"),
  { loading: skeleton("h-24") },
);

const MarginCascadeSlider = dynamic(
  () => import("@/components/widgets/MarginCascadeSlider"),
  { loading: skeleton("h-72") },
);

const CollaborativeApprovalPanel = dynamic(
  () => import("@/components/widgets/CollaborativeApprovalPanel"),
  { loading: skeleton("h-56") },
);

const DualViewMatrixTable = dynamic(
  () => import("@/components/widgets/DualViewMatrixTable"),
  { loading: skeleton("h-72") },
);

export const mdxComponents = {
  MetricsGrid,
  BeforeAfterSlider,
  DesignTokenInspector,
  FlowChartSimulator,
  SummaryKpiGrid,
  ItemizedDrawer,
  InteractiveVarianceSimulator,
  BomBreadcrumbFocus,
  MarginCascadeSlider,
  CollaborativeApprovalPanel,
  DualViewMatrixTable,
};

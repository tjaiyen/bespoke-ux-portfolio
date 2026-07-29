"use client";

import { metricTrend, type CaseStudyMetricValue } from "@/lib/caseStudySchema";

interface MetricsGridProps {
  metrics: CaseStudyMetricValue[];
  /** Accessible name for the group. Defaults to a generic label. */
  label?: string;
}

/**
 * Business-impact metrics. Rendered as a definition list so screen readers announce
 * each figure with its own label rather than as loose text.
 *
 * Direction is never carried by color alone (WCAG 1.4.1): each metric states its
 * direction in text, and the arrow glyph is aria-hidden so it is not read aloud twice.
 */
export default function MetricsGrid({
  metrics,
  label = "Business impact metrics",
}: MetricsGridProps) {
  if (metrics.length === 0) return null;

  return (
    <dl
      aria-label={label}
      className="my-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="rounded-lg border border-border-subtle bg-bg-surface p-5"
        >
          <dt className="font-sans text-sm text-text-muted">{metric.label}</dt>
          <dd className="mt-2">
            <span className="block font-mono text-3xl text-text-main">
              {metric.value}
            </span>
            <span className="mt-1 flex items-center gap-1 font-sans text-sm text-text-muted">
              {/* Glyph = DIRECTION (from trend). Colour + spoken qualifier = GOODNESS
                  (from isPositive). Conflating them made a -79% improvement point up. */}
              <span
                aria-hidden="true"
                className={
                  metric.isPositive
                    ? "text-status-positive"
                    : "text-status-negative"
                }
              >
                {{ up: "▲", down: "▼", flat: "→" }[metricTrend(metric)]}
              </span>
              <span>
                {metric.change}
                <span className="sr-only">
                  {metric.isPositive ? " (improvement)" : " (decline)"}
                </span>
              </span>
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

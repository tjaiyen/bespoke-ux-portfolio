"use client";

import { useId, useState } from "react";

interface KpiItem {
  label: string;
  value: string;
  subtext?: string;
  status: "good" | "warning" | "critical";
}

interface SummaryKpiGridProps {
  items: KpiItem[];
  label?: string;
}

/**
 * High-density KPI summary for operational dashboards.
 *
 * Accessibility:
 * - Status is never color-only: each card carries a visible icon (✓ / ! / ✕)
 *   and an `aria-label` that includes the status word.
 * - Grouped in a `<dl>` with an accessible name so screen-reader users hear
 *   context before the individual metrics.
 */
export default function SummaryKpiGrid({
  items,
  label = "Key performance indicators",
}: SummaryKpiGridProps) {
  const baseId = useId();

  const statusMeta = {
    good: { icon: "✓", word: "good", ring: "ring-green-500/30", bg: "bg-green-500/10" },
    warning: { icon: "!", word: "warning", ring: "ring-amber-500/30", bg: "bg-amber-500/10" },
    critical: { icon: "✕", word: "critical", ring: "ring-red-500/30", bg: "bg-red-500/10" },
  };

  return (
    <dl aria-label={label} className="my-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item, i) => {
        const meta = statusMeta[item.status];
        return (
          <div
            key={`${baseId}-${i}`}
            aria-label={`${item.label}: ${item.value}, status ${meta.word}`}
            className={`rounded-lg border border-border-subtle bg-bg-surface p-4 ring-1 ${meta.ring}`}
          >
            <dt className="flex items-center gap-2 font-sans text-xs text-text-muted">
              <span
                aria-hidden="true"
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${meta.bg} text-text-main`}
              >
                {meta.icon}
              </span>
              {item.label}
            </dt>
            <dd className="mt-2">
              <span className="block font-mono text-2xl text-text-main">
                {item.value}
              </span>
              {item.subtext && (
                <span className="mt-1 block font-sans text-xs text-text-muted">
                  {item.subtext}
                </span>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

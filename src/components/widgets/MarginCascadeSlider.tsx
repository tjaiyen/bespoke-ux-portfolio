"use client";

import { useId, useState } from "react";

interface CascadeLevel {
  label: string;
  quantity: number;
  unitCost: number;
}

interface MarginCascadeSliderProps {
  levels: CascadeLevel[];
  label?: string;
}

/**
 * Interactive margin cascade: adjust a component cost and watch the
 * impact ripple up through BOM levels to finished-goods margin.
 *
 * Accessibility:
 * - Cost slider is a native range input with explicit label.
 * - Updated margin figures live in an aria-live region.
 * - Each cascade row announces its contribution via aria-label.
 */
export default function MarginCascadeSlider({
  levels,
  label = "Margin cascade explorer",
}: MarginCascadeSliderProps) {
  const baseId = useId();
  const [costDelta, setCostDelta] = useState(0);

  const totalBaseCost = levels.reduce(
    (sum, l) => sum + l.quantity * l.unitCost,
    0,
  );
  const totalNewCost = levels.reduce(
    (sum, l, i) => sum + l.quantity * (l.unitCost + (i === 0 ? costDelta : 0)),
    0,
  );
  const marginImpact = totalNewCost - totalBaseCost;

  return (
    <section
      aria-label={label}
      className="my-8 rounded-lg border border-border-subtle bg-bg-surface p-6"
    >
      <div className="mb-5">
        <label
          htmlFor={`${baseId}-delta`}
          className="block font-sans text-sm text-text-muted"
        >
          Component cost change
        </label>
        <input
          id={`${baseId}-delta`}
          type="range"
          min={-10}
          max={10}
          step={0.5}
          value={costDelta}
          onChange={(e) => setCostDelta(Number(e.target.value))}
          className="mt-2 h-11 w-full accent-accent-brand focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none"
        />
        <span className="font-mono text-xs text-text-muted">
          {costDelta >= 0 ? "+" : ""}
          {costDelta.toFixed(2)} per unit
        </span>
      </div>

      <div aria-live="polite" className="space-y-2">
        {levels.map((level, i) => {
          const base = level.quantity * level.unitCost;
          const adjusted =
            level.quantity * (level.unitCost + (i === 0 ? costDelta : 0));
          const delta = adjusted - base;

          return (
            <div
              key={i}
              aria-label={`${level.label}: ${level.quantity} units at ${adjusted.toFixed(2)} each, impact ${delta >= 0 ? "+" : ""}${delta.toFixed(2)}`}
              className="flex items-center gap-3 rounded border border-border-subtle px-4 py-2"
            >
              <span
                aria-hidden="true"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg-app font-mono text-xs text-text-muted"
              >
                {i + 1}
              </span>
              <span className="font-sans text-sm text-text-main">
                {level.label}
              </span>
              <span className="ml-auto font-mono text-sm text-text-main">
                ${adjusted.toFixed(2)}
              </span>
              {delta !== 0 && (
                <span
                  aria-hidden="true"
                  className={`font-mono text-xs ${delta > 0 ? "text-red-500" : "text-green-500"}`}
                >
                  {delta > 0 ? "+" : ""}
                  {delta.toFixed(2)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 border-t border-border-subtle pt-3">
        <p className="font-sans text-sm text-text-muted">
          Total cost impact:{" "}
          <span className="font-mono text-text-main">
            ${marginImpact.toFixed(2)}
          </span>
        </p>
      </div>
    </section>
  );
}

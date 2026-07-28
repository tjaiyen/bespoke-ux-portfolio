"use client";

import { useId, useState } from "react";

interface VarianceScenario {
  laborRate: number;
  materialRate: number;
  overheadRate: number;
  standardHours: number;
  actualHours: number;
}

interface InteractiveVarianceSimulatorProps {
  label?: string;
}

/**
 * Interactive what-if simulator for manufacturing cost variances.
 * Users adjust rates and hours to see real-time impact on labor,
 * material, and overhead variances.
 *
 * Accessibility:
 * - Each slider is a native `<input type="range">` with an explicit
 *   `<label>` (programmatic association, not placeholder).
 * - Recalculated totals are wrapped in an `aria-live="polite"` region
 *   so screen-reader users hear updated figures without focus disruption.
 * - Direction (favorable / unfavorable) is announced in text, not just color.
 */
export default function InteractiveVarianceSimulator({
  label = "Variance simulator",
}: InteractiveVarianceSimulatorProps) {
  const baseId = useId();

  const [scenario, setScenario] = useState<VarianceScenario>({
    laborRate: 28,
    materialRate: 12.5,
    overheadRate: 8,
    standardHours: 400,
    actualHours: 460,
  });

  const laborVariance =
    (scenario.actualHours - scenario.standardHours) * scenario.laborRate;
  const materialVariance = 0; // simplified: fixed quantity in this demo
  const overheadVariance =
    (scenario.actualHours - scenario.standardHours) * scenario.overheadRate;
  const totalVariance = laborVariance + materialVariance + overheadVariance;

  const fmt = (n: number) =>
    `${n >= 0 ? "+" : ""}${n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    })}`;

  const varLabel = (n: number) =>
    n > 0 ? "unfavorable" : n < 0 ? "favorable" : "neutral";

  const sliders: {
    key: keyof VarianceScenario;
    label: string;
    min: number;
    max: number;
    step: number;
  }[] = [
    { key: "laborRate", label: "Labor rate", min: 15, max: 60, step: 0.5 },
    { key: "materialRate", label: "Material rate", min: 5, max: 30, step: 0.5 },
    { key: "overheadRate", label: "Overhead rate", min: 4, max: 20, step: 0.5 },
    { key: "standardHours", label: "Standard hours", min: 200, max: 800, step: 10 },
    { key: "actualHours", label: "Actual hours", min: 200, max: 800, step: 10 },
  ];

  return (
    <section
      aria-label={label}
      className="my-8 rounded-lg border border-border-subtle bg-bg-surface p-6"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {sliders.map((s) => {
          const id = `${baseId}-${s.key}`;
          return (
            <div key={s.key}>
              <label htmlFor={id} className="block font-sans text-sm text-text-muted">
                {s.label}
              </label>
              <input
                id={id}
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={scenario[s.key]}
                onChange={(e) =>
                  setScenario((prev) => ({
                    ...prev,
                    [s.key]: Number(e.target.value),
                  }))
                }
                className="mt-2 h-11 w-full accent-accent-brand focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none"
              />
              <span className="font-mono text-xs text-text-muted">
                {s.key.includes("Rate")
                  ? `$${scenario[s.key].toFixed(2)}/hr`
                  : `${scenario[s.key]} hrs`}
              </span>
            </div>
          );
        })}
      </div>

      <div
        aria-live="polite"
        className="mt-6 grid gap-3 border-t border-border-subtle pt-5 sm:grid-cols-3"
      >
        <div className="rounded border border-border-subtle p-3">
          <p className="font-sans text-xs text-text-muted">Labor variance</p>
          <p className="mt-1 font-mono text-xl text-text-main">
            {fmt(laborVariance)}
          </p>
          <p className="sr-only">{varLabel(laborVariance)}</p>
          <p
            aria-hidden="true"
            className={`font-sans text-xs ${laborVariance > 0 ? "text-red-500" : laborVariance < 0 ? "text-green-500" : "text-text-muted"}`}
          >
            {varLabel(laborVariance)}
          </p>
        </div>
        <div className="rounded border border-border-subtle p-3">
          <p className="font-sans text-xs text-text-muted">Overhead variance</p>
          <p className="mt-1 font-mono text-xl text-text-main">
            {fmt(overheadVariance)}
          </p>
          <p className="sr-only">{varLabel(overheadVariance)}</p>
          <p
            aria-hidden="true"
            className={`font-sans text-xs ${overheadVariance > 0 ? "text-red-500" : overheadVariance < 0 ? "text-green-500" : "text-text-muted"}`}
          >
            {varLabel(overheadVariance)}
          </p>
        </div>
        <div className="rounded border border-border-subtle p-3">
          <p className="font-sans text-xs text-text-muted">Total variance</p>
          <p className="mt-1 font-mono text-xl text-text-main">
            {fmt(totalVariance)}
          </p>
          <p className="sr-only">{varLabel(totalVariance)}</p>
          <p
            aria-hidden="true"
            className={`font-sans text-xs ${totalVariance > 0 ? "text-red-500" : totalVariance < 0 ? "text-green-500" : "text-text-muted"}`}
          >
            {varLabel(totalVariance)}
          </p>
        </div>
      </div>
    </section>
  );
}

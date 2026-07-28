"use client";

import { useId, useState } from "react";

interface MatrixRow {
  id: string;
  label: string;
  financeScore: number; // 0-100
  opsScore: number; // 0-100
  budget: string;
  downtimeRisk: string;
}

interface DualViewMatrixTableProps {
  rows: MatrixRow[];
  label?: string;
}

type ViewMode = "finance" | "operations";

/**
 * Capital-request matrix with a finance/operations lens toggle.
 *
 * Accessibility:
 * - Toggle is a native <fieldset> with <legend> and radio buttons,
 *   so screen readers announce the group purpose and current selection.
 * - Table uses scope="col" headers; each row carries an aria-label
 *   summarizing both scores so direction is never color-only.
 * - Scores are colored but also announced via aria-label.
 */
export default function DualViewMatrixTable({
  rows,
  label = "Capital request matrix",
}: DualViewMatrixTableProps) {
  const baseId = useId();
  const [view, setView] = useState<ViewMode>("finance");

  const scoreColor = (n: number) => {
    if (n >= 70) return "text-status-positive";
    if (n >= 40) return "text-status-warning";
    return "text-status-negative";
  };

  const scoreBg = (n: number) => {
    if (n >= 70) return "bg-status-positive/10";
    if (n >= 40) return "bg-status-warning/10";
    return "bg-status-negative/10";
  };

  return (
    <section aria-label={label} className="my-8">
      <fieldset className="mb-4 flex items-center gap-3">
        <legend className="sr-only">Select view lens</legend>
        {(["finance", "operations"] as ViewMode[]).map((mode) => {
          const inputId = `${baseId}-${mode}`;
          return (
            <label
              key={mode}
              htmlFor={inputId}
              className={`flex min-h-11 cursor-pointer items-center gap-2 rounded border px-4 py-2 font-sans text-sm capitalize focus-within:ring-2 focus-within:ring-accent-focus ${
                view === mode
                  ? "border-accent-brand bg-bg-surface text-text-main"
                  : "border-border-subtle text-text-muted"
              }`}
            >
              <input
                id={inputId}
                type="radio"
                name={`${baseId}-view`}
                value={mode}
                checked={view === mode}
                onChange={() => setView(mode)}
                className="accent-accent-brand"
              />
              {mode}
            </label>
          );
        })}
      </fieldset>

      <div className="overflow-hidden rounded-lg border border-border-subtle bg-bg-surface">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border-subtle">
              <th scope="col" className="px-4 py-3 font-sans text-xs text-text-muted">
                Request
              </th>
              <th scope="col" className="px-4 py-3 font-sans text-xs text-text-muted">
                {view === "finance" ? "NPV Score" : "Downtime Risk"}
              </th>
              <th scope="col" className="px-4 py-3 font-sans text-xs text-text-muted">
                {view === "finance" ? "Budget" : "Safety Impact"}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const primaryScore = view === "finance" ? row.financeScore : row.opsScore;
              const secondaryScore = view === "finance" ? row.opsScore : row.financeScore;
              const primaryLabel = view === "finance" ? row.budget : row.downtimeRisk;

              return (
                <tr
                  key={row.id}
                  aria-label={`${row.label}: finance ${row.financeScore}, operations ${row.opsScore}`}
                  className="border-b border-border-subtle last:border-b-0"
                >
                  <td className="px-4 py-3 font-sans text-sm text-text-main">
                    {row.label}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-2 rounded px-2 py-1 font-mono text-sm ${scoreBg(primaryScore)} ${scoreColor(primaryScore)}`}
                    >
                      {primaryScore}
                      <span className="sr-only">
                        out of 100; {primaryScore >= 70 ? "high" : primaryScore >= 40 ? "medium" : "low"} priority
                      </span>
                    </span>
                    <span className="ml-2 font-sans text-xs text-text-muted">
                      ({view === "finance" ? "ops" : "fin"} {secondaryScore})
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-text-main">
                    {primaryLabel}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

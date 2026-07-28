"use client";

import { useId, useState } from "react";

interface ApprovalStage {
  id: string;
  label: string;
  financeStatus: "pending" | "approved" | "rejected";
  opsStatus: "pending" | "approved" | "rejected";
  notes?: string;
}

interface CollaborativeApprovalPanelProps {
  stages: ApprovalStage[];
  label?: string;
}

/**
 * Side-by-side approval tracker showing finance and operations
 * review status for each stage.
 *
 * Accessibility:
 * - Uses a <table> with proper <th scope="col"> so screen readers
 *   announce column headers with each cell.
 * - Status is never color-only: each cell includes the status word
 *   in an aria-label and a visible icon.
 * - Sortable conceptually, but static here — no aria-sort needed.
 */
export default function CollaborativeApprovalPanel({
  stages,
  label = "Collaborative approval tracker",
}: CollaborativeApprovalPanelProps) {
  const baseId = useId();

  const statusMeta = {
    pending: { icon: "○", word: "pending", color: "text-text-muted" },
    approved: { icon: "✓", word: "approved", color: "text-status-positive" },
    rejected: { icon: "✕", word: "rejected", color: "text-status-negative" },
  };

  return (
    <section aria-label={label} className="my-8 overflow-hidden rounded-lg border border-border-subtle bg-bg-surface">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border-subtle">
            <th scope="col" className="px-4 py-3 font-sans text-xs text-text-muted">
              Stage
            </th>
            <th scope="col" className="px-4 py-3 font-sans text-xs text-text-muted">
              Finance
            </th>
            <th scope="col" className="px-4 py-3 font-sans text-xs text-text-muted">
              Operations
            </th>
          </tr>
        </thead>
        <tbody>
          {stages.map((stage) => {
            const f = statusMeta[stage.financeStatus];
            const o = statusMeta[stage.opsStatus];
            return (
              <tr key={stage.id} className="border-b border-border-subtle last:border-b-0">
                <td className="px-4 py-3 font-sans text-sm text-text-main">
                  {stage.label}
                  {stage.notes && (
                    <span className="mt-1 block font-sans text-xs text-text-muted">
                      {stage.notes}
                    </span>
                  )}
                </td>
                <td
                  aria-label={`Finance: ${f.word}`}
                  className={`px-4 py-3 font-mono text-sm ${f.color}`}
                >
                  <span aria-hidden="true" className="mr-1">
                    {f.icon}
                  </span>
                  <span className="sr-only">{f.word}</span>
                  <span aria-hidden="true" className="font-sans text-xs capitalize">
                    {stage.financeStatus}
                  </span>
                </td>
                <td
                  aria-label={`Operations: ${o.word}`}
                  className={`px-4 py-3 font-mono text-sm ${o.color}`}
                >
                  <span aria-hidden="true" className="mr-1">
                    {o.icon}
                  </span>
                  <span className="sr-only">{o.word}</span>
                  <span aria-hidden="true" className="font-sans text-xs capitalize">
                    {stage.opsStatus}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

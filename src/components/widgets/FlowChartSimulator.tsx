"use client";

import { useId, useState } from "react";

export interface FlowStep {
  id: string;
  label: string;
  /** What happens at this step — revealed when the step is expanded. */
  detail: string;
  /** Optional design decision made here. Surfaces the reasoning, not just the flow. */
  decision?: string;
}

interface FlowChartSimulatorProps {
  steps: FlowStep[];
  label: string;
}

/**
 * Steps through a user path, one expandable node at a time.
 *
 * Accessibility notes:
 * - Each node is a native <button> carrying `aria-expanded` and `aria-controls`
 *   pointing at its own panel (WCAG 4.1.2). State is exposed, not implied by styling.
 * - Progress is announced through an `aria-live="polite"` region so a screen-reader
 *   user hears "Step 2 of 4" without focus being moved (WCAG 4.1.3).
 * - Fully keyboard-operable with no trap: every control is natively focusable and
 *   nothing captures the tab sequence.
 * - Step numbers are decorative duplicates of information already in the accessible
 *   name, so they are aria-hidden to avoid double announcement.
 */
export default function FlowChartSimulator({
  steps,
  label,
}: FlowChartSimulatorProps) {
  const [openId, setOpenId] = useState<string | null>(steps[0]?.id ?? null);
  const baseId = useId();

  const openIndex = steps.findIndex((s) => s.id === openId);

  return (
    <section
      aria-label={label}
      className="my-8 rounded-lg border border-border-subtle bg-bg-surface p-6"
    >
      <p aria-live="polite" className="font-mono text-xs text-text-muted">
        {openIndex >= 0
          ? `Step ${openIndex + 1} of ${steps.length}: ${steps[openIndex].label}`
          : `${steps.length} steps, none expanded`}
      </p>

      <ol className="mt-4 space-y-2">
        {steps.map((step, i) => {
          const panelId = `${baseId}-panel-${step.id}`;
          const isOpen = openId === step.id;

          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : step.id)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex min-h-11 w-full items-center gap-3 rounded border border-border-subtle px-4 py-2 text-left focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none"
              >
                <span
                  aria-hidden="true"
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs ${
                    isOpen
                      ? "bg-accent-brand text-bg-surface"
                      : "border border-border-subtle text-text-muted"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="font-sans text-text-main">{step.label}</span>
                <span
                  aria-hidden="true"
                  className="ml-auto font-mono text-xs text-text-muted"
                >
                  {isOpen ? "−" : "+"}
                </span>
              </button>

              {/* Always rendered, collapsed with `hidden` rather than unmounted.
                  Unmounting breaks aria-controls: the button would reference an id
                  that is not in the document, which axe/pa11y flag and which leaves
                  assistive tech with a control pointing at nothing. `hidden` removes
                  the panel from both layout and the accessibility tree while keeping
                  the relationship intact — the canonical disclosure pattern.
                  Verified: with unmounting, 3 of 4 buttons had dangling aria-controls. */}
              <div
                id={panelId}
                hidden={!isOpen}
                className="mt-2 ml-10 border-l border-border-subtle pl-4"
              >
                <p className="font-sans text-sm text-text-main">{step.detail}</p>
                {step.decision && (
                  <p className="mt-2 font-sans text-sm text-text-muted">
                    <span className="font-mono text-xs uppercase">
                      Decision:{" "}
                    </span>
                    {step.decision}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

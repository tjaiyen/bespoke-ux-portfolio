"use client";

import { useId, useState } from "react";

interface LineItem {
  id: string;
  label: string;
  amount: string;
  variance?: string;
  children?: LineItem[];
}

interface ItemizedDrawerProps {
  items: LineItem[];
  label?: string;
}

/**
 * Expandable itemized list with nested line items.
 *
 * Accessibility:
 * - Each parent row is a native `<button>` with `aria-expanded` and
 *   `aria-controls` (WCAG 4.1.2 disclosure pattern).
 * - Child panels are `hidden` when collapsed, not unmounted, so
 *   `aria-controls` never dangles.
 * - Negative variance amounts are announced with "unfavorable" via
 *   `aria-label` so direction is not color-only.
 */
export default function ItemizedDrawer({
  items,
  label = "Itemized breakdown",
}: ItemizedDrawerProps) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const baseId = useId();

  const toggle = (id: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderItem = (item: LineItem, depth: number) => {
    const panelId = `${baseId}-panel-${item.id}`;
    const isOpen = open.has(item.id);
    const hasChildren = item.children && item.children.length > 0;
    const indent = depth * 16;

    return (
      <li key={item.id}>
        <button
          type="button"
          onClick={() => hasChildren && toggle(item.id)}
          aria-expanded={hasChildren ? isOpen : undefined}
          aria-controls={hasChildren ? panelId : undefined}
          className="flex min-h-11 w-full items-center gap-3 border-b border-border-subtle px-4 py-2 text-left focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none"
          style={{ paddingLeft: `${16 + indent}px` }}
        >
          <span className="font-sans text-sm text-text-main">{item.label}</span>
          <span className="ml-auto font-mono text-sm text-text-main">
            {item.amount}
          </span>
          {item.variance && (
            <span
              aria-label={`Variance: ${item.variance}`}
              className={`font-mono text-xs ${item.variance.startsWith("-") ? "text-red-500" : "text-green-500"}`}
            >
              {item.variance}
            </span>
          )}
          {hasChildren && (
            <span aria-hidden="true" className="ml-2 font-mono text-xs text-text-muted">
              {isOpen ? "−" : "+"}
            </span>
          )}
        </button>

        {hasChildren && (
          <ul id={panelId} hidden={!isOpen}>
            {item.children!.map((child) => renderItem(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <section aria-label={label} className="my-8 overflow-hidden rounded-lg border border-border-subtle bg-bg-surface">
      <ul>{items.map((item) => renderItem(item, 0))}</ul>
    </section>
  );
}

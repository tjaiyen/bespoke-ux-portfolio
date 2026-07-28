"use client";

import { useId, useState } from "react";

interface BomLevel {
  id: string;
  label: string;
  level: number;
}

interface BomBreadcrumbFocusProps {
  levels: BomLevel[];
  label?: string;
}

/**
 * BOM breadcrumb navigation with focus management.
 *
 * Accessibility:
 * - Uses a native <nav> with aria-label so screen readers announce
 *   the region purpose before the breadcrumb items.
 * - Each crumb is a native <button> (not a link — there is no URL
 *   change, only in-page focus). `aria-current="true"` marks the
 *   active level.
 * - Keyboard users can Tab through crumbs and Enter/Space to activate.
 */
export default function BomBreadcrumbFocus({
  levels,
  label = "BOM navigation",
}: BomBreadcrumbFocusProps) {
  const [activeId, setActiveId] = useState<string>(levels[0]?.id ?? "");
  const baseId = useId();

  return (
    <nav aria-label={label} className="my-8">
      <ol className="flex flex-wrap items-center gap-1">
        {levels.map((level, i) => {
          const isActive = level.id === activeId;
          return (
            <li key={level.id} className="flex items-center">
              {i > 0 && (
                <span aria-hidden="true" className="mx-1 text-text-muted">
                  /
                </span>
              )}
              <button
                type="button"
                onClick={() => setActiveId(level.id)}
                aria-current={isActive ? "true" : undefined}
                className={`min-h-11 rounded px-3 py-1 font-sans text-sm focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none ${
                  isActive
                    ? "bg-accent-brand font-medium text-bg-surface"
                    : "text-text-muted hover:bg-bg-app hover:text-text-main"
                }`}
              >
                <span aria-hidden="true" className="mr-1 font-mono text-xs opacity-60">
                  L{level.level}
                </span>
                {level.label}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 rounded-lg border border-border-subtle bg-bg-surface p-4">
        <p className="font-mono text-xs text-text-muted">
          Active level: {levels.find((l) => l.id === activeId)?.label}
        </p>
      </div>
    </nav>
  );
}

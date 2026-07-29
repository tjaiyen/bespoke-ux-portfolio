"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, site } from "@/lib/site";
import ThemeToggle from "./ThemeToggle";

/**
 * Site navigation. Present on every route.
 *
 * Before this existed a case study was a dead end: one link on the page (the skip link),
 * no way back to the index, no way home, and the designer's name nowhere on the site.
 *
 * `aria-current="page"` marks the active route for assistive tech rather than relying on
 * the colour change alone (WCAG 1.4.1 — never carry meaning by colour only).
 */
export default function SiteHeader() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    // Fully opaque, not bg-bg-app/90. On the routes that carry the WebGL stage a 10%
    // translucent header composites nav text over a moving canvas — a contrast failure
    // the audit could never see, because it computes from flat token values.
    <header className="border-b border-border-subtle bg-bg-app">
      {/* Two deliberate rows on phones, one row from `sm` up.
          Left to wrap on its own the nav broke mid-list and the theme toggle floated
          between the two lines, giving a 173px header — 21% of a 375x812 viewport, before
          any content. Stacking on purpose is both shorter and legible as a decision. */}
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-y-1 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4 sm:px-6 sm:py-4">
        <Link
          href="/"
          className="group flex min-h-11 flex-col justify-center py-0.5 focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none"
          aria-label={`${site.name} — home`}
        >
          <span className="font-serif text-lg leading-tight text-text-main">
            {site.name}
          </span>
          <span className="font-mono text-[11px] leading-tight text-text-muted">
            {site.role}
          </span>
        </Link>

        <div className="flex w-full items-center justify-between sm:w-auto sm:justify-normal sm:gap-x-1">
          <nav aria-label="Main">
            <ul className="flex flex-wrap items-center gap-x-0 sm:gap-x-1">
              {NAV.filter((item) => item.href !== "/").map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={`flex min-h-11 items-center rounded px-1.5 font-sans text-sm sm:px-3 focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none ${
                      isActive(item.href)
                        ? "text-text-main underline decoration-accent-brand decoration-2 underline-offset-8"
                        : "text-text-muted hover:text-text-main"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          {/* Outside <nav>: it is a control, not a destination. */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

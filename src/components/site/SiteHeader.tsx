"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, site } from "@/lib/site";

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
    <header className="border-b border-border-subtle bg-bg-app/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-6 py-4">
        <Link
          href="/"
          className="group flex min-h-11 flex-col justify-center focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none"
          aria-label={`${site.name} — home`}
        >
          <span className="font-serif text-lg leading-tight text-text-main">
            {site.name}
          </span>
          <span className="font-mono text-[11px] leading-tight text-text-muted">
            {site.role}
          </span>
        </Link>

        <nav aria-label="Main">
          <ul className="flex items-center gap-1">
            {NAV.filter((item) => item.href !== "/").map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`flex min-h-11 items-center rounded px-3 font-sans text-sm focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none ${
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
      </div>
    </header>
  );
}

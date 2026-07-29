import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Page not found" };

/**
 * Custom 404. The default was unstyled with no route back into the site — a dead end for
 * anyone arriving on a stale or mistyped link, which for a portfolio is often a recruiter
 * following a URL from an application sent weeks ago.
 */
export default function NotFound() {
  return (
    <main id="main-content" className="mx-auto w-full max-w-3xl px-6 py-24">
      <p className="font-mono text-[11px] tracking-widest text-text-muted uppercase">
        404
      </p>
      <h1 className="mt-3 font-serif text-4xl leading-tight text-text-main">
        That page isn&rsquo;t here
      </h1>
      <p className="mt-4 max-w-xl font-sans text-lg text-text-muted">
        The link may be out of date. Everything on the site is one click from here.
      </p>
      <ul className="mt-8 flex flex-wrap gap-3">
        {[
          { href: "/case-studies", label: "View work" },
          { href: "/gallery", label: "Gallery" },
          { href: "/about", label: "About" },
          { href: "/", label: "Home" },
        ].map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="inline-flex min-h-11 items-center rounded-md border border-border-subtle px-5 font-sans text-sm text-text-main focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

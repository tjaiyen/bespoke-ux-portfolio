import Link from "next/link";
import { contactLinks, site } from "@/lib/site";

/**
 * Site footer. Carries identity and contact — the two things a recruiter needs after
 * reading a case study, and which the site previously had nowhere at all.
 *
 * Contact links render only when configured in src/lib/site.ts. While they are unset the
 * footer shows a single honest line rather than dead links or invented details.
 */
export default function SiteFooter() {
  const links = contactLinks();
  const year = 2026;

  return (
    // bg-bg-app is load-bearing, not cosmetic: with no background the footer would sit
    // transparently over the WebGL stage on the routes that carry it.
    <footer className="mt-24 border-t border-border-subtle bg-bg-app">
      <div className="mx-auto w-full max-w-4xl px-6 py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div className="max-w-sm">
            <p className="font-serif text-xl text-text-main">{site.name}</p>
            <p className="mt-2 font-sans text-sm text-text-muted">
              {site.discipline}
            </p>
          </div>

          <nav aria-label="Footer">
            <h2 className="font-mono text-xs tracking-wide text-text-muted uppercase">
              Elsewhere
            </h2>
            {links.length > 0 ? (
              <ul className="mt-3 space-y-1">
                {links.map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      className="flex min-h-11 items-center font-sans text-sm text-text-main underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 max-w-xs font-sans text-sm text-text-muted">
                Contact details not yet published — set them in{" "}
                <code className="font-mono text-xs">src/lib/site.ts</code>.
              </p>
            )}
          </nav>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border-subtle pt-6">
          <p className="font-mono text-xs text-text-muted">
            © {year} {site.name}
          </p>
          <Link
            href="/case-studies"
            className="flex min-h-11 items-center font-sans text-sm text-text-muted underline-offset-4 hover:text-text-main hover:underline focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none"
          >
            View all work
          </Link>
        </div>
      </div>
    </footer>
  );
}

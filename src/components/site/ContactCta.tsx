import Link from "next/link";
import { contactLinks, site } from "@/lib/site";

/**
 * End-of-case-study call to action — placed where reader intent peaks, which is the moment
 * someone finishes a study rather than the moment they land.
 *
 * Degrades honestly: while src/lib/site.ts carries null contact fields it points at /about
 * rather than rendering dead buttons. Publishing an email address is a decision for the
 * site's owner, so the component is built to work either way and never invents a value.
 */
export default function ContactCta() {
  const links = contactLinks();

  return (
    <section
      aria-labelledby="cta-heading"
      className="mt-20 rounded-lg border border-border-subtle bg-bg-surface p-8"
    >
      <h2 id="cta-heading" className="font-serif text-2xl text-text-main">
        Want the longer version?
      </h2>
      <p className="mt-3 max-w-xl font-sans text-text-muted">
        Happy to walk through the decisions behind this — including the ones that
        didn&rsquo;t work.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        {links.length > 0 ? (
          links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="inline-flex min-h-11 items-center rounded-md bg-accent-brand px-5 font-sans text-sm text-bg-surface focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none"
            >
              {l.label}
            </a>
          ))
        ) : (
          <Link
            href="/about"
            className="inline-flex min-h-11 items-center rounded-md bg-accent-brand px-5 font-sans text-sm text-bg-surface focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none"
          >
            About {site.shortName}
          </Link>
        )}
        <Link
          href="/case-studies"
          className="inline-flex min-h-11 items-center rounded-md border border-border-subtle px-5 font-sans text-sm text-text-main focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none"
        >
          More work
        </Link>
      </div>
    </section>
  );
}

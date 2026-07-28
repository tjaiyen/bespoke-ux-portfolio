import Link from "next/link";

/**
 * Section navigation for case studies (7–9 minute reads, 5 sections, previously no
 * wayfinding at all — you either scrolled or you left).
 *
 * Rendered from the MDX source at build time and positioned with CSS `position: sticky`.
 * NO client JavaScript: the stress test found a scroll-spy would add a listener and a
 * hydration cost against a 0.90 perf floor and an LCP that is already the binding
 * constraint. Highlighting the active section is not worth that; being able to see the
 * shape of the article and jump is.
 *
 * Hidden below `xl` — there is no room beside a 3xl column on smaller screens, and a
 * collapsed mobile TOC would reintroduce the JS this avoids.
 */
export default function CaseStudyToc({ headings }: { headings: string[] }) {
  if (headings.length < 3) return null;

  return (
    <nav
      aria-labelledby="toc-heading"
      className="sticky top-8 hidden xl:block"
    >
      <h2
        id="toc-heading"
        className="font-mono text-[11px] tracking-widest text-text-muted uppercase"
      >
        Contents
      </h2>
      <ol className="mt-4 space-y-1">
        {headings.map((h, i) => (
          <li key={h}>
            <Link
              href={`#${slugify(h)}`}
              className="flex min-h-11 items-center gap-3 font-sans text-sm text-text-muted hover:text-text-main focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none"
            >
              <span aria-hidden="true" className="font-mono text-xs tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>{h}</span>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

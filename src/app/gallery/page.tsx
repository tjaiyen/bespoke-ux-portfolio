import Image from "next/image";
import type { Metadata } from "next";
import { listGallery, noteFor, receiptSummary } from "@/lib/gallery";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Generated sites that passed a real accessibility gate, each published with the conformance report from that run.",
};

export default function GalleryPage() {
  const sites = listGallery();

  return (
    <main id="main-content" className="mx-auto w-full max-w-4xl px-6 py-16">
      <h1 className="font-serif text-4xl leading-tight text-text-main">
        Gallery
      </h1>
      <p className="mt-4 max-w-2xl font-sans text-lg text-text-muted">
        Output from an engine I built that refuses to finish until the page it
        generated passes a real accessibility audit. Every site below is
        self-contained and ships with the conformance report from its own gate run.
      </p>

      {/* The scope statement is deliberately prominent and deliberately narrow.
          A receipt that overstated itself would undermine the exact argument this
          gallery exists to make. */}
      <aside
        aria-labelledby="scope-heading"
        className="mt-8 rounded-lg border border-border-subtle bg-bg-surface p-6"
      >
        <h2
          id="scope-heading"
          className="font-mono text-[11px] tracking-widest text-accent-brand uppercase"
        >
          What the receipt does and does not cover
        </h2>
        <p className="mt-3 font-sans text-sm leading-relaxed text-text-main">
          Each report records a real axe-core run over the rendered DOM in headless
          Chrome, plus structural invariants the generator cannot talk its way past.
          That is the <strong>machine-testable subset</strong> — one desktop viewport,
          initial load. It is <strong>not</strong> a WCAG conformance claim: keyboard
          traversal, reflow, and input purpose are listed in each report as{" "}
          <em>not evaluated</em>, because axe has no automated rule for them.
        </p>
      </aside>

      <ul className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2">
        {sites.map((site) => {
          const s = receiptSummary(site);
          return (
            <li
              key={site.slug}
              className="flex flex-col overflow-hidden rounded-lg border border-border-subtle bg-bg-surface"
            >
              <Image
                src={`/gallery/_shots/${site.slug}.png`}
                alt={`Screenshot of the ${site.slug} concept: ${noteFor(site.slug) ?? "generated site"}.`}
                width={1280}
                height={800}
                className="w-full border-b border-border-subtle"
              />
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-serif text-xl text-text-main capitalize">
                    {site.slug}
                  </h2>
                  <span className="font-mono text-[11px] tracking-widest text-status-positive uppercase">
                    Gate passed
                  </span>
                </div>

                {noteFor(site.slug) && (
                  <p className="mt-2 font-sans text-sm text-text-muted">
                    {noteFor(site.slug)}
                  </p>
                )}

                <dl className="mt-4 grid grid-cols-3 gap-2 font-mono text-xs">
                  <div>
                    <dt className="text-text-muted">Criteria</dt>
                    <dd className="text-text-main tabular-nums">
                      {s.supports} full
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">Invariants</dt>
                    <dd className="text-text-main tabular-nums">
                      {s.invariantsPassed}/{s.invariants}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">Not evaluated</dt>
                    <dd className="text-text-main tabular-nums">
                      {s.notEvaluated}
                    </dd>
                  </div>
                </dl>

                <p className="mt-3 font-mono text-[11px] text-text-muted">
                  axe-core {site.meta.axeVersion} · {site.meta.date}
                </p>

                <div className="mt-auto flex flex-wrap gap-3 pt-5">
                  <a
                    href={`/gallery/${site.slug}/index.html`}
                    className="inline-flex min-h-11 items-center rounded-md bg-accent-brand px-4 font-sans text-sm text-bg-surface focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none"
                  >
                    Open site
                  </a>
                  <a
                    href={`/gallery/_receipts/${site.slug}.md`}
                    className="inline-flex min-h-11 items-center rounded-md border border-border-subtle px-4 font-sans text-sm text-text-main focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none"
                  >
                    Read the receipt
                  </a>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

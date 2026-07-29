import Image from "next/image";
import type { Metadata } from "next";
import {
  listGallery,
  noteFor,
  receiptSummary,
  provenanceOf,
  isInstrument,
  galleryCounts,
} from "@/lib/gallery";
import { assetPath } from "@/lib/assetPath";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Generated sites that passed a real accessibility gate, each published with the conformance report from that run.",
};

export default function GalleryPage() {
  const sites = listGallery();
  const c = galleryCounts();

  return (
    <main id="main-content" className="mx-auto w-full max-w-4xl px-6 py-16">
      <h1 className="font-serif text-4xl leading-tight text-text-main">
        Gallery
      </h1>
      <p className="mt-4 max-w-2xl font-sans text-lg text-text-muted">
        {c.total} self-contained 3D sites, each shipping the conformance report from a
        real accessibility gate run against the exact copy published here.
      </p>
      <p className="mt-4 max-w-2xl font-sans text-text-muted">
        <strong className="text-text-main">
          {c.instruments} of them render finance and manufacturing instruments
        </strong>{" "}
        rather than atmosphere — an 85% Wright learning slope, earned value computed from
        the BCWS/BCWP/ACWP identities, a 3.06× wrap rate, a{" "}
        <span className="font-mono text-sm">[0/±45/90]</span> layup at a 350°F cure, a
        buy-to-fly ratio measured off the geometry, borrowing-base carve-outs, three-way
        match, a price × quantity variance rectangle. Real axes, real tick labels, figures
        a cost accountant would recognise. That is the part of this set I care most about:
        it is the domain I came from, drawn accurately.
      </p>
      {/* The provenance split is stated up front rather than buried. This page used to
          claim the engine gate-loop over everything shown; it is true of the generated
          sites and NOT of the hand-authored ones, whose receipt is a post-hoc re-audit.
          Counts come from galleryCounts() so the prose cannot drift from the set. */}
      <p className="mt-4 max-w-2xl font-sans text-text-muted">
        Two kinds of work, and the difference matters.{" "}
        <strong className="text-text-main">{c.handAuthored} are hand-authored</strong> —
        built on a shared scroll-story runtime where scroll position is the timeline — and
        their receipt is an independent re-audit of the shipping code.{" "}
        <strong className="text-text-main">{c.generated} came out of the generator</strong>
        , and for those the audit <em>was</em> the gate: it could not finish until the page
        it produced passed. Every card says which it is.
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
                src={assetPath(`/gallery/_shots/${site.slug}.png`)}
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

                {/* Provenance on every card, not just in the intro. "Gate passed" above
                    is true of all 47 — verified by a fresh run against this copy — but
                    only the generated ones had the gate standing between them and being
                    finished, and a reader should not have to infer which is which. */}
                <p className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-widest uppercase">
                  <span className="text-text-muted">
                    {provenanceOf(site.slug) === "hand-authored"
                      ? "Hand-authored"
                      : "Engine-generated"}
                  </span>
                  {isInstrument(site.slug) && (
                    <>
                      {/* DRAWN, not typed. A "·" character in --border-subtle is text as
                          far as axe is concerned, so it is judged against the 4.5:1 body
                          floor rather than the 3:1 boundary floor that token is sized
                          for — 3.08:1, failing on all 15 cards. A background-coloured box
                          is a decorative graphic and carries no text-contrast duty. Same
                          idiom as the rule in Act.tsx. */}
                      <span
                        aria-hidden="true"
                        className="inline-block h-1 w-1 shrink-0 rounded-full bg-border-subtle"
                      />
                      <span className="text-accent-brand">
                        Cost-accounting instrument
                      </span>
                    </>
                  )}
                </p>

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
                    href={assetPath(`/gallery/${site.slug}/index.html`)}
                    className="inline-flex min-h-11 items-center rounded-md bg-accent-brand px-4 font-sans text-sm text-bg-surface focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none"
                  >
                    Open site
                  </a>
                  <a
                    href={assetPath(`/gallery/_receipts/${site.slug}.md`)}
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

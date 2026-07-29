import type { ReactNode } from "react";

/**
 * The home page is structured as numbered acts with open interludes between them.
 *
 * Two jobs. The obvious one is pacing — a portfolio that is five sibling sections reads
 * as a document; numbered acts give it a direction to travel in. The less obvious one is
 * that the panel is what keeps the WebGL stage behind it legal: every act sits on an
 * opaque token background, so text is never composited over the canvas and the contrast
 * audit's flat-value arithmetic stays true.
 *
 * `bg-bg-app` and `bg-bg-surface` are both fully opaque. Do not introduce an alpha here.
 */
export function Act({
  numeral,
  kicker,
  title,
  id,
  heading = "h2",
  tone = "app",
  reveal = true,
  children,
}: {
  numeral: string;
  /** Short label for what this act is doing. Never the title — that would read twice. */
  kicker: string;
  title: string;
  id: string;
  /** Act I carries the page's h1; the rest are h2. */
  heading?: "h1" | "h2";
  tone?: "app" | "surface";
  /**
   * Act I opts out. It is already fully in view at load, and an entry-range reveal on an
   * element that never enters is the one way this pattern can leave content invisible.
   */
  reveal?: boolean;
  children: ReactNode;
}) {
  const Heading = heading;
  return (
    <section aria-labelledby={id} className="mx-auto w-full max-w-4xl px-4 sm:px-6">
      <div
        className={`rounded-xl border border-border-subtle p-6 shadow-xl shadow-black/5 sm:p-10 ${
          reveal ? "reveal" : ""
        } ${tone === "surface" ? "bg-bg-surface" : "bg-bg-app"}`}
      >
        <p className="flex items-center gap-3 font-mono text-[11px] tracking-[0.2em] uppercase">
          <span className="text-accent-brand">Act {numeral}</span>
          <span aria-hidden="true" className="h-px w-6 bg-border-subtle" />
          <span className="text-text-muted">{kicker}</span>
        </p>
        <Heading
          id={id}
          className={`act-title mt-4 font-serif text-text-main ${
            heading === "h1" ? "act-title-lead" : ""
          }`}
        >
          {title}
        </Heading>
        <div className="mt-6">{children}</div>
      </div>
    </section>
  );
}

/**
 * An open band where the stage performs with nothing on top of it.
 *
 * Deliberately empty: no text, no landmark, nothing in the accessibility tree. Its whole
 * purpose is to be the part of the page where the backdrop is the content. Shorter on
 * phones, where 70vh of scrolling past nothing stops reading as a beat and starts
 * reading as a bug.
 */
export function Interlude() {
  return <div className="h-[45vh] sm:h-[70vh]" />;
}

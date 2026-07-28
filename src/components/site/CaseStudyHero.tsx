import type { Evidence } from "@/lib/evidence";

/**
 * Case-study hero rendered from the study's OWN data.
 *
 * The previous heroes were generated abstract graphics — coloured grids and node blobs
 * that said nothing, and which the heuristic pass ranked as the portfolio's largest
 * remaining impression risk. The standing plan was "wait for real screenshots", which
 * blocked indefinitely on work only TJ can do.
 *
 * This renders the one thing already available and true: the study's self-evidencing
 * before→after metric, as proportional bars. Domain-appropriate (this is finance and
 * operations work — the artefact of the job is a chart), honest (it is the study's own
 * figure, not decoration), and it demonstrates craft instead of asserting it.
 *
 * SELECTION REUSES THE SOURCING RULE (plan finding P1). Only metrics stating an explicit
 * numeric before→after are eligible. Charting an unsourced figure would render the
 * portfolio's weakest claim as an authoritative-looking graphic — strictly worse than
 * leaving it as text. Studies with no eligible metric get the typographic fallback.
 *
 * Inline SVG: no network request, no layout shift, scales to any width, and it themes
 * itself because it draws with `currentColor` and the design tokens.
 */

function parseValue(v: string): number | null {
  const n = Number.parseFloat(v.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Converts "5 days" / "20 min" to comparable minutes so the bars are proportional. */
const UNIT_MINUTES: Record<string, number> = {
  min: 1, mins: 1, minute: 1, minutes: 1,
  hr: 60, hrs: 60, hour: 60, hours: 60,
  day: 1440, days: 1440,
  week: 10080, weeks: 10080,
};

function toComparable(raw: string, fallbackUnit: string): number | null {
  const n = parseValue(raw);
  if (n === null) return null;
  const unit = (raw.match(/[a-z]+/i)?.[0] ?? fallbackUnit).toLowerCase();
  return n * (UNIT_MINUTES[unit] ?? 1);
}

export default function CaseStudyHero({
  evidence,
  title,
}: {
  evidence: Evidence | null;
  title: string;
}) {
  // Typographic fallback when no metric qualifies — never invent one.
  if (!evidence) {
    return (
      <div
        role="img"
        aria-label={`Cover graphic for ${title}`}
        className="mt-10 flex h-56 w-full items-center justify-center rounded-lg border border-border-subtle bg-bg-surface"
      >
        <span className="px-8 text-center font-serif text-2xl text-text-muted">
          {title}
        </span>
      </div>
    );
  }

  const fallbackUnit = evidence.to.match(/[a-z]+/i)?.[0] ?? "";
  const a = toComparable(evidence.from, fallbackUnit);
  const b = toComparable(evidence.to, fallbackUnit);

  // Proportional widths, floored so the "after" bar stays visible at extreme ratios
  // (5 days → 20 min is 360:1; an honest bar would be a single pixel).
  const max = Math.max(a ?? 1, b ?? 1);
  const wA = a !== null ? Math.max(6, (a / max) * 100) : 100;
  const wB = b !== null ? Math.max(6, (b / max) * 100) : 40;

  const alt = `${evidence.label} reduced from ${evidence.from} to ${evidence.to}.`;

  return (
    <figure className="mt-10">
      <div
        role="img"
        aria-label={alt}
        className="rounded-lg border border-border-subtle bg-bg-surface p-8 sm:p-12"
      >
        <p className="font-mono text-[11px] tracking-widest text-text-muted uppercase">
          {evidence.label}
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-mono text-sm text-text-muted">Before</span>
              <span className="font-mono text-lg text-text-muted tabular-nums">
                {evidence.from}
              </span>
            </div>
            <div
              aria-hidden="true"
              className="mt-2 h-3 rounded-full bg-border-subtle"
              style={{ width: `${wA}%` }}
            />
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-mono text-sm text-text-main">After</span>
              <span className="font-mono text-lg text-status-positive tabular-nums">
                {evidence.to}
              </span>
            </div>
            <div
              aria-hidden="true"
              className="mt-2 h-3 rounded-full bg-status-positive"
              style={{ width: `${wB}%` }}
            />
          </div>
        </div>
      </div>
      <figcaption className="mt-3 font-sans text-sm text-text-muted">
        {alt} Modelled from the assumptions stated in this study — not a measured
        production result.
      </figcaption>
    </figure>
  );
}

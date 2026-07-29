import type { ReactNode } from "react";

/**
 * Side-by-side wireframes of the direction taken and the direction discarded.
 *
 * Why this artifact and not a hi-fi screen: every case study already shows its CHOSEN
 * direction as a working widget. The DISCARDED one — which is the more interesting half,
 * and the half a senior reviewer actually assesses — existed only as prose. A trade-off
 * you can read is weaker than a trade-off you can see.
 *
 * Deliberately low fidelity. These are wireframes: grey blocks, no imagery, no real
 * typography. Colour carries exactly one meaning (which direction was taken) and nothing
 * decorative. A polished mockup here would read as a finished screen and quietly claim
 * more than a concept should.
 *
 * Accessibility: each panel is role="img" with a descriptive label, and the caption below
 * repeats the same decision in text — so the artifact is not the only carrier of the
 * information. In a portfolio arguing for verified accessibility, a diagram that only
 * works visually would be self-defeating.
 */

export type WireBlock = {
  /** Rough height in wireframe units (1 unit ≈ 12px). */
  h: number;
  /** Optional label rendered inside the block. */
  label?: string;
  /** Renders as a split row of N columns rather than one bar. */
  cols?: number;
  /** Emphasised block — the element the direction hinges on. */
  key?: boolean;
};

function Wireframe({
  blocks,
  taken,
  label,
}: {
  blocks: WireBlock[];
  taken: boolean;
  label: string;
}) {
  const unit = 12;
  const pad = 10;
  const width = 260;
  const inner = width - pad * 2;
  let y = pad;
  const shapes: ReactNode[] = [];

  blocks.forEach((b, i) => {
    const h = b.h * unit;
    if (b.cols && b.cols > 1) {
      const gap = 8;
      const w = (inner - gap * (b.cols - 1)) / b.cols;
      for (let c = 0; c < b.cols; c++) {
        shapes.push(
          <rect
            key={`${i}-${c}`}
            x={pad + c * (w + gap)}
            y={y}
            width={w}
            height={h}
            rx={3}
            className={
              b.key
                ? "fill-accent-brand/25 stroke-accent-brand"
                : "fill-text-muted/12 stroke-border-subtle"
            }
            strokeWidth={1}
          />,
        );
      }
    } else {
      shapes.push(
        <rect
          key={i}
          x={pad}
          y={y}
          width={inner}
          height={h}
          rx={3}
          className={
            b.key
              ? "fill-accent-brand/25 stroke-accent-brand"
              : "fill-text-muted/12 stroke-border-subtle"
          }
          strokeWidth={1}
        />,
      );
      if (b.label) {
        shapes.push(
          <text
            key={`t-${i}`}
            x={pad + 8}
            y={y + h / 2 + 4}
            className="fill-text-muted"
            style={{ fontSize: 9, fontFamily: "var(--font-jetbrains-mono), monospace" }}
          >
            {b.label}
          </text>,
        );
      }
    }
    y += h + 8;
  });

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${width} ${y + pad - 8}`}
      className={`w-full rounded border ${
        taken ? "border-status-positive/50" : "border-border-subtle"
      }`}
      style={{ background: "var(--bg-app)" }}
    >
      {shapes}
    </svg>
  );
}

export default function DirectionComparison({
  label,
  takenTitle,
  takenBlocks,
  takenNote,
  discardedTitle,
  discardedBlocks,
  discardedNote,
  criterion,
  cost,
}: {
  label: string;
  takenTitle: string;
  takenBlocks: WireBlock[];
  takenNote: string;
  discardedTitle: string;
  discardedBlocks: WireBlock[];
  discardedNote: string;
  /** What decided it. */
  criterion: string;
  /** What accepting the chosen direction cost. */
  cost: string;
}) {
  return (
    <figure className="my-10" aria-labelledby="dc-heading">
      <figcaption
        id="dc-heading"
        className="font-mono text-[11px] tracking-widest text-text-muted uppercase"
      >
        {label} — wireframes of both directions
      </figcaption>

      {/* Stacks below sm. A two-column comparison at 375px is the horizontal-overflow
          trap this project has hit twice; designed against it rather than caught by it. */}
      <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <h3 className="flex items-center gap-2 font-sans text-sm text-text-main">
            <span className="font-mono text-[10px] tracking-widest text-status-positive uppercase">
              Taken
            </span>
            {takenTitle}
          </h3>
          <div className="mt-2">
            <Wireframe
              blocks={takenBlocks}
              taken
              label={`Wireframe of the direction taken: ${takenTitle}. ${takenNote}`}
            />
          </div>
          <p className="mt-2 font-sans text-sm text-text-muted">{takenNote}</p>
        </div>

        <div>
          <h3 className="flex items-center gap-2 font-sans text-sm text-text-main">
            <span className="font-mono text-[10px] tracking-widest text-text-muted uppercase">
              Discarded
            </span>
            {discardedTitle}
          </h3>
          <div className="mt-2">
            <Wireframe
              blocks={discardedBlocks}
              taken={false}
              label={`Wireframe of the discarded direction: ${discardedTitle}. ${discardedNote}`}
            />
          </div>
          <p className="mt-2 font-sans text-sm text-text-muted">
            {discardedNote}
          </p>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-4 rounded-lg border border-border-subtle bg-bg-surface p-5 sm:grid-cols-2">
        <div>
          <dt className="font-mono text-[10px] tracking-widest text-text-muted uppercase">
            What decided it
          </dt>
          <dd className="mt-1 font-sans text-sm text-text-main">{criterion}</dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] tracking-widest text-text-muted uppercase">
            Cost accepted
          </dt>
          <dd className="mt-1 font-sans text-sm text-text-main">{cost}</dd>
        </div>
      </dl>
    </figure>
  );
}

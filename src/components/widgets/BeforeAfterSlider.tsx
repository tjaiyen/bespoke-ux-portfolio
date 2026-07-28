"use client";

import Image from "next/image";
import { useId, useState } from "react";

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  /** Descriptive alt text — what a hiring manager should notice. Required, never decorative. */
  beforeAlt: string;
  afterAlt: string;
  caption: string;
  width?: number;
  height?: number;
  beforeLabel?: string;
  afterLabel?: string;
}

/**
 * Legacy-vs-redesign comparison with a draggable/keyboard divider.
 *
 * Accessibility notes:
 * - The control is a native `<input type="range">`, not a div with role="slider".
 *   Native range inputs come with keyboard operation (arrows, Home/End), correct
 *   role/value semantics, and touch support already correct — reimplementing that
 *   with ARIA is how focus traps and broken value announcements get shipped.
 * - Both images carry real alt text and stay in the accessibility tree, so a screen
 *   reader user gets both descriptions regardless of divider position (the clip is
 *   purely visual).
 * - Explicit width/height on next/image reserves the box before load → CLS 0.
 */
export default function BeforeAfterSlider({
  beforeImage,
  afterImage,
  beforeAlt,
  afterAlt,
  caption,
  width = 1200,
  height = 750,
  beforeLabel = "Before",
  afterLabel = "After",
}: BeforeAfterSliderProps) {
  const [position, setPosition] = useState(50);
  const captionId = useId();

  return (
    <figure className="my-8">
      <div
        className="relative overflow-hidden rounded-lg border border-border-subtle bg-bg-surface"
        style={{ aspectRatio: `${width} / ${height}` }}
      >
        <Image
          src={afterImage}
          alt={afterAlt}
          width={width}
          height={height}
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Clipped overlay — inset-based clipping is a paint operation, not a reflow. */}
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <Image
            src={beforeImage}
            alt={beforeAlt}
            width={width}
            height={height}
            className="h-full w-full object-cover"
          />
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-accent-brand"
          style={{ left: `${position}%` }}
        />

        <span
          aria-hidden="true"
          className="absolute top-3 left-3 rounded bg-bg-app/90 px-2 py-1 font-mono text-xs text-text-main"
        >
          {beforeLabel}
        </span>
        <span
          aria-hidden="true"
          className="absolute top-3 right-3 rounded bg-bg-app/90 px-2 py-1 font-mono text-xs text-text-main"
        >
          {afterLabel}
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={position}
        onChange={(e) => setPosition(Number(e.target.value))}
        aria-label={`Reveal position: drag to compare ${beforeLabel} and ${afterLabel}`}
        aria-describedby={captionId}
        aria-valuetext={`${position}% ${afterLabel} revealed`}
        className="mt-4 h-11 w-full cursor-ew-resize accent-accent-brand focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none"
      />

      <figcaption id={captionId} className="mt-2 font-sans text-sm text-text-muted">
        {caption}
      </figcaption>
    </figure>
  );
}

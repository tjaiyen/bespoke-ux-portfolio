"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  /** Stagger index — each step delays the reveal by 60ms. */
  index?: number;
  className?: string;
}

/**
 * Staggered section reveal — CSS transition + IntersectionObserver, no animation
 * library. (Replaced framer-motion 2026-07-28: it cost 34 KB brotli plus hydration
 * main-thread time on every route, and its SSR `initial` hid wrapped content behind
 * inline opacity:0. Measured against the Lighthouse >= 0.98 target — ADR-014/A20.)
 *
 * Three hard constraints from the design rules:
 *   1. Only `opacity` and `transform` animate. Animating a layout property (height,
 *      margin, top) would register as layout shift, and CLS = 0 is a hard CI gate.
 *      translateY compiles to a transform, which is composited and does not reflow.
 *   2. `prefers-reduced-motion` is respected. When set, the element renders in its
 *      final state with no transition at all — not a faster animation, none.
 *   3. NEVER wrap the LCP element / above-the-fold hero. The initial state is
 *      opacity:0 (that is what a reveal IS), so a wrapped hero paints late.
 *      Below the fold only, where IntersectionObserver belongs.
 */
export default function Reveal({ children, index = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const delay = `${index * 0.06}s`;
  // motion-reduce:transition-none satisfies constraint 2 without a matchMedia
  // branch: with reduced motion the reveal still fires, but applies instantly.
  return (
    <div
      ref={ref}
      className={`motion-reduce:transition-none ${className ?? ""}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(12px)",
        transition: `opacity 0.4s ease-out ${delay}, transform 0.4s ease-out ${delay}`,
      }}
    >
      {children}
    </div>
  );
}

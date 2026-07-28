"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  /** Stagger index — each step delays the reveal by 60ms. */
  index?: number;
  className?: string;
}

/**
 * Staggered section reveal.
 *
 * Two hard constraints from the design rules:
 *   1. Only `opacity` and `transform` animate. Animating a layout property (height,
 *      margin, top) would register as layout shift, and CLS = 0 is a hard CI gate.
 *      `y` compiles to a transform, which is composited and does not reflow.
 *   2. `prefers-reduced-motion` is respected. When set, the element renders in its
 *      final state with no transition at all — not a faster animation, none.
 *   3. NEVER wrap the LCP element / above-the-fold hero. Framer Motion SSRs
 *      `initial` as inline `opacity: 0`, so the element is invisible in the HTML
 *      until hydration + whileInView fires — measured as 2.8s of LCP render delay
 *      (85% of LCP) under Lighthouse throttling. Below the fold only.
 */
export default function Reveal({ children, index = 0, className }: RevealProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

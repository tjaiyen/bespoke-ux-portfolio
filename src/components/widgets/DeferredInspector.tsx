"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

// ssr:false is allowed here because this is a Client Component. The inspector's JS
// (and its hydration work) is not fetched or executed until the section scrolls near
// the viewport — before this change it hydrated during the initial trace window and
// inflated main-thread time on the home page (ADR-014/A20).
const DesignTokenInspector = dynamic(
  () => import("@/components/widgets/DesignTokenInspector"),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-96 animate-pulse rounded bg-bg-surface"
        aria-hidden="true"
      />
    ),
  },
);

/**
 * Defers the design-token inspector until it is about to enter the viewport.
 *
 * CLS guard: the placeholder is a fixed h-96 (384px). If the inspector's real height
 * ever diverges from 384px, the swap registers as layout shift and CLS = 0 is a hard
 * CI gate — keep the placeholder height honest if the inspector grows.
 */
export default function DeferredInspector() {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      // Load ahead of arrival so the swap happens off-screen in the common case.
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {near ? (
        <DesignTokenInspector />
      ) : (
        <div
          className="h-96 animate-pulse rounded bg-bg-surface"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

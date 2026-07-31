"use client";

import { useEffect, useState } from "react";

/**
 * Colour-theme switch.
 *
 * This exists because the light theme was unreachable. The token cascade is
 * `@media (prefers-color-scheme: dark) { :root:not(.light) { … } }`, so `.light` on the
 * root is the ONLY way to override a dark OS preference — and nothing in the app ever
 * set it. A visitor on a dark-mode machine could not see the light theme at all, and the
 * design-system inspector's own "light" button silently failed: it removed `.dark`, the
 * media query immediately re-applied dark, and the control reported a state it had not
 * reached.
 *
 * So this writes BOTH classes explicitly rather than toggling one. "System" is a real
 * third state — clearing both and deferring to the OS — because a visitor who never
 * touches this control should keep following their own setting.
 */
type Choice = "light" | "dark" | "system";

export function applyTheme(choice: Choice) {
  const root = document.documentElement;
  root.classList.toggle("dark", choice === "dark");
  root.classList.toggle("light", choice === "light");
  try {
    if (choice === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", choice);
  } catch {
    // Private browsing or blocked storage: the class still applied, the choice just
    // will not survive a reload. Failing the toggle over this would be worse.
  }
}

function readDark(): boolean {
  const root = document.documentElement;
  if (root.classList.contains("dark")) return true;
  if (root.classList.contains("light")) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export default function ThemeToggle() {
  // Lazily read the initial value straight from the DOM/OS. `document` does not exist
  // during the server render, so that pass still falls back to `null` (the label stays
  // generic) — the mismatch is patched up on the client's first paint, same as before.
  const [dark, setDark] = useState<boolean | null>(() =>
    typeof document === "undefined" ? null : readDark(),
  );

  useEffect(() => {
    // Track the OS while the visitor is on "system", so the label stays honest.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setDark(readDark());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const label =
    dark === null
      ? "Switch colour theme"
      : dark
        ? "Switch to the light theme"
        : "Switch to the dark theme";

  return (
    <button
      type="button"
      onClick={() => {
        const next = dark ? "light" : "dark";
        applyTheme(next);
        setDark(!dark);
      }}
      aria-label={label}
      title={label}
      className="flex min-h-11 min-w-11 items-center justify-center rounded text-text-muted hover:text-text-main focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none"
    >
      {/* Both glyphs ship; CSS shows the one for the active theme, so the icon is correct
          on first paint without waiting for JS to decide. aria-hidden because the button
          already carries an accessible name. */}
      <svg
        aria-hidden="true"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        className="theme-icon-sun"
      >
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.6v2.2M12 19.2v2.2M4.2 12H2M22 12h-2.2M6.3 6.3 4.8 4.8M19.2 19.2l-1.5-1.5M17.7 6.3l1.5-1.5M4.8 19.2l1.5-1.5" />
      </svg>
      <svg
        aria-hidden="true"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="theme-icon-moon"
      >
        <path d="M20.5 14.3A8.6 8.6 0 0 1 9.7 3.5a8.6 8.6 0 1 0 10.8 10.8Z" />
      </svg>
    </button>
  );
}

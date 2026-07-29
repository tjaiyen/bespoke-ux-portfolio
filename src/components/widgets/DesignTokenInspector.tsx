"use client";

import { useCallback, useState } from "react";

const COLOR_ROLES = [
  { token: "--bg-app", utility: "bg-bg-app", role: "Page background" },
  { token: "--bg-surface", utility: "bg-bg-surface", role: "Raised surface" },
  { token: "--text-main", utility: "text-text-main", role: "Primary text" },
  { token: "--text-muted", utility: "text-text-muted", role: "Secondary text" },
  { token: "--accent-brand", utility: "bg-accent-brand", role: "Brand accent" },
  { token: "--accent-focus", utility: "ring-accent-focus", role: "Focus ring" },
  { token: "--border-subtle", utility: "border-border-subtle", role: "Hairline border" },
] as const;

const TYPE_SCALE = [
  { utility: "font-serif", family: "Playfair Display", usage: "Headers" },
  { utility: "font-sans", family: "Plus Jakarta Sans", usage: "Body copy" },
  { utility: "font-mono", family: "JetBrains Mono", usage: "Data, metrics, tokens" },
] as const;

type Theme = "light" | "dark";

/**
 * Live design-token inspector. Switching the mode toggles `.dark` on <html>, which is
 * what the `@custom-variant dark (&:where(.dark, .dark *))` declaration keys off — so
 * every swatch below re-resolves through the same CSS variables the real components use.
 * Nothing here is a hardcoded color; the swatches ARE the tokens.
 *
 * Resolved values are read with getComputedStyle after mount rather than hardcoded, so
 * the panel cannot drift from globals.css — if a token changes, this display changes.
 */
/** Reads the live computed value of each token off the document root. */
function readTokens(): Record<string, string> {
  const styles = getComputedStyle(document.documentElement);
  const next: Record<string, string> = {};
  for (const { token } of COLOR_ROLES) {
    next[token] = styles.getPropertyValue(token).trim() || "—";
  }
  return next;
}

export default function DesignTokenInspector() {
  const [theme, setTheme] = useState<Theme>("light");
  const [resolved, setResolved] = useState<Record<string, string>>({});

  // Toggling the class and re-reading happen together in the handler rather than in an
  // effect: the read must observe the DOM *after* the class flips, and doing it here
  // keeps the state update tied to the user action that caused it (no set-state-in-effect).
  const applyTheme = useCallback((next: Theme) => {
    // Writes BOTH classes. Toggling only `.dark` was a real bug: on a machine set to dark
    // mode, choosing "light" removed `.dark`, the `@media (prefers-color-scheme: dark)`
    // rule immediately re-applied the dark tokens, and the control reported a state it
    // had never reached. `:root:not(.light)` in that media query is the escape hatch, and
    // nothing was setting `.light`.
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.classList.toggle("light", next === "light");
    setTheme(next);
    setResolved(readTokens());
  }, []);

  // Initial read once the list is in the DOM. A ref callback runs after mount without
  // being an effect, and the swatches themselves render correctly before this resolves
  // because they reference var(--token) directly rather than the read-back string.
  const captureInitial = useCallback((node: HTMLUListElement | null) => {
    if (node) setResolved(readTokens());
  }, []);

  return (
    <section
      aria-labelledby="token-inspector-heading"
      className="my-8 rounded-lg border border-border-subtle bg-bg-surface p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2
          id="token-inspector-heading"
          className="font-serif text-2xl text-text-main"
        >
          Design token inspector
        </h2>

        <div
          role="group"
          aria-label="Theme mode"
          className="flex gap-1 rounded-md border border-border-subtle p-1"
        >
          {(["light", "dark"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => applyTheme(mode)}
              aria-pressed={theme === mode}
              aria-label={`${mode} mode`}
              className={`min-h-11 min-w-11 rounded px-4 font-mono text-sm capitalize focus-visible:ring-2 focus-visible:ring-accent-focus focus-visible:outline-none ${
                theme === mode
                  ? "bg-accent-brand text-bg-surface"
                  : "text-text-muted"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <h3 className="mt-6 font-sans text-sm text-text-muted">Color roles</h3>
      <ul
        ref={captureInitial}
        className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        {COLOR_ROLES.map(({ token, utility, role }) => (
          <li
            key={token}
            className="flex items-center gap-3 rounded border border-border-subtle p-3"
          >
            <span
              aria-hidden="true"
              className="h-8 w-8 shrink-0 rounded border border-border-subtle"
              style={{ background: `var(${token})` }}
            />
            <span className="min-w-0">
              <span className="block font-mono text-xs text-text-main">
                {token}
              </span>
              <span className="block font-sans text-xs text-text-muted">
                {role} · <code>{utility}</code>
              </span>
              <span className="block font-mono text-xs text-text-muted">
                {resolved[token] ?? "—"}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <h3 className="mt-6 font-sans text-sm text-text-muted">Type scale</h3>
      <ul className="mt-3 space-y-3">
        {TYPE_SCALE.map(({ utility, family, usage }) => (
          <li
            key={utility}
            className="rounded border border-border-subtle p-3"
          >
            <span className={`block text-xl text-text-main ${utility}`}>
              {family}
            </span>
            <span className="mt-1 block font-mono text-xs text-text-muted">
              {utility} · {usage}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

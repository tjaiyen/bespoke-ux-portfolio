#!/usr/bin/env node
/**
 * WCAG 1.4.3 / 1.4.11 contrast audit, computed directly from globals.css.
 *
 * Deterministic and offline: parses the HSL token values out of the stylesheet and
 * computes real contrast ratios for every pair that actually renders together, in BOTH
 * themes. This is stronger than an axe/pa11y sweep for contrast, because those only see
 * pairs a crawler happens to encounter on a rendered page — a token combination used by
 * a widget that is collapsed, lazy-loaded, or on an unwritten case study is never
 * checked. Here the token matrix is the input, so coverage does not depend on routing.
 *
 * Exit 0 = all pairs pass, exit 1 = at least one failure. Read the table either way
 * (never conflate the exit code with "no findings").
 */
import fs from "node:fs";
import path from "node:path";

const CSS = path.join(process.cwd(), "src", "app", "globals.css");

/** Parses `--name: hsl(H S% L%);` declarations out of a `:root {}` / `.dark {}` block. */
function parseBlock(css, selector) {
  const re = new RegExp(`${selector}\\s*\\{([^}]*)\\}`, "m");
  const body = css.match(re)?.[1] ?? "";
  const out = {};
  for (const m of body.matchAll(
    /--([\w-]+):\s*hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*\)/g,
  )) {
    out[`--${m[1]}`] = hslToRgb(+m[2], +m[3], +m[4]);
  }
  return out;
}

function hslToRgb(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
}

/** Relative luminance per WCAG 2.x. */
function luminance([r, g, b]) {
  const c = [r, g, b]
    .map((v) => v / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function ratio(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

// Pairs that genuinely render together in the components built so far.
// `min` is the WCAG threshold for that pair's role.
const PAIRS = [
  { fg: "--text-main", bg: "--bg-app", min: 4.5, why: "body text on page (1.4.3)" },
  { fg: "--text-main", bg: "--bg-surface", min: 4.5, why: "text on cards/panels (1.4.3)" },
  { fg: "--text-muted", bg: "--bg-app", min: 4.5, why: "secondary text on page (1.4.3)" },
  { fg: "--text-muted", bg: "--bg-surface", min: 4.5, why: "secondary text on cards (1.4.3)" },
  { fg: "--accent-brand", bg: "--bg-app", min: 3.0, why: "brand accent / divider (1.4.11)" },
  { fg: "--bg-surface", bg: "--accent-brand", min: 4.5, why: "button label on brand fill (1.4.3)" },
  { fg: "--border-subtle", bg: "--bg-app", min: 3.0, why: "hairline border on page (1.4.11)" },
  { fg: "--border-subtle", bg: "--bg-surface", min: 3.0, why: "hairline border on card (1.4.11)" },
  { fg: "--accent-focus", bg: "--bg-app", min: 3.0, why: "focus ring on page (1.4.11)" },
  { fg: "--accent-focus", bg: "--bg-surface", min: 3.0, why: "focus ring on card (1.4.11)" },
  // Status semantics used by the Phase-3b widgets (A21). All are text roles.
  { fg: "--status-positive", bg: "--bg-app", min: 4.5, why: "favourable variance / KPI ok text (1.4.3)" },
  { fg: "--status-positive", bg: "--bg-surface", min: 4.5, why: "favourable text on cards (1.4.3)" },
  { fg: "--status-negative", bg: "--bg-app", min: 4.5, why: "unfavourable variance / critical text (1.4.3)" },
  { fg: "--status-negative", bg: "--bg-surface", min: 4.5, why: "unfavourable text on cards (1.4.3)" },
  { fg: "--status-warning", bg: "--bg-app", min: 4.5, why: "warning text (1.4.3)" },
  { fg: "--status-warning", bg: "--bg-surface", min: 4.5, why: "warning text on cards (1.4.3)" },
];

const css = fs.readFileSync(CSS, "utf8");
const themes = { light: parseBlock(css, ":root"), dark: parseBlock(css, "\\.dark") };

let failures = 0;
for (const [name, tokens] of Object.entries(themes)) {
  if (Object.keys(tokens).length === 0) {
    console.error(`ERROR: parsed zero tokens for "${name}" — check globals.css structure`);
    process.exit(1);
  }
  console.log(`\n${name.toUpperCase()} THEME`);
  console.log("  ratio   min   result  pair");
  for (const { fg, bg, min, why } of PAIRS) {
    if (!tokens[fg] || !tokens[bg]) {
      console.log(`  ------  ----  SKIP    ${fg} on ${bg} (token missing)`);
      continue;
    }
    const r = ratio(tokens[fg], tokens[bg]);
    const ok = r >= min;
    if (!ok) failures++;
    console.log(
      `  ${r.toFixed(2).padStart(6)}  ${min.toFixed(1)}   ${ok ? "PASS  " : "FAIL  "}  ${fg} on ${bg} — ${why}`,
    );
  }
}

console.log(
  `\n${failures === 0 ? "PASS" : "FAIL"}: ${failures} contrast violation(s) across ${
    Object.keys(themes).length * PAIRS.length
  } checked pairs.`,
);
process.exit(failures === 0 ? 0 : 1);

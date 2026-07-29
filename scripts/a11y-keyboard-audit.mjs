#!/usr/bin/env node
/**
 * Tier-2 accessibility audit: the dynamic behaviour pa11y cannot see.
 *
 * pa11y is a static snapshot — it catches missing alts and contrast, but not whether
 * focus can escape a widget, whether the skip link is genuinely first in tab order, or
 * whether a component reflows at 375px. Those need a driven browser, which is this.
 *
 * Checks, per route, at 375 / 768 / 1280:
 *   2.1.1  every interactive control is keyboard-reachable
 *   2.1.2  no keyboard trap — tabbing from the last control escapes
 *   2.4.1  skip link is first in tab order and its target exists
 *   2.4.7  focused elements have a visible focus indicator
 *   2.5.5  interactive targets are >= 44x44 CSS px
 *   4.1.2  interactive elements expose an accessible name
 *   S7     no horizontal overflow at any viewport
 *   S8     the decorative WebGL stage stays inert (aria-hidden, no tabindex/role,
 *          pointer-events: none) — three attributes on one element, any of which an
 *          edit can drop without another check noticing
 *   S9     every scroll-revealed block is genuinely visible once centred, so a broken
 *          animation-range cannot leave content at opacity 0 while pa11y and every
 *          text assertion still pass
 *
 * Usage: PA11Y_CHROME_PATH=<chrome> node scripts/a11y-keyboard-audit.mjs [baseUrl]
 * Exit 0 = all checks pass; 1 = at least one failure. Read the report either way.
 */
import puppeteer from "puppeteer";
import { allRoutes } from "../src/lib/routes.mjs";

const BASE = process.argv[2] ?? process.env.PA11Y_BASE_URL ?? "http://localhost:3000";

// Case-study routes are DERIVED, not hardcoded — same reasoning as gen-pa11yci.mjs.
// These pages carry every project widget (sliders, sortable tables, approval panels,
// BOM breadcrumbs), so they are the routes where keyboard operability matters most.
// Auditing only the static three would have left the interactive surface unchecked
// while the suite reported a clean run.

const ROUTES = allRoutes();
const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
];

const failures = [];
const fail = (route, vp, code, msg) => {
  failures.push(`${route} @${vp} [${code}] ${msg}`);
  console.log(`    FAIL [${code}] ${msg}`);
};

const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.PA11Y_CHROME_PATH || undefined,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

for (const route of ROUTES) {
  console.log(`\n${route}`);
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto(BASE + route, { waitUntil: "networkidle0" });
    console.log(`  ${vp.name} (${vp.width}px)`);

    // ---- S7: horizontal overflow -------------------------------------------------
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    if (overflow > 0) fail(route, vp.name, "S7", `horizontal overflow of ${overflow}px`);

    // ---- 2.5.5 target size + 4.1.2 accessible name --------------------------------
    const controls = await page.evaluate(() => {
      const sel = 'a[href], button, input, select, textarea, [role="button"]';
      return [...document.querySelectorAll(sel)]
        .filter((e) => e.offsetParent !== null || e.getClientRects().length > 0)
        .map((e) => {
          const r = e.getBoundingClientRect();
          // EFFECTIVE target = the element's box unioned with every <label> that
          // activates it. Measuring the input alone reports a bare radio/checkbox as
          // 13x13 and fails 2.5.5 on a control whose real tap area is the whole
          // labelled row — a false positive that would push someone to "fix" markup
          // that is already correct.
          let x1 = r.left, y1 = r.top, x2 = r.right, y2 = r.bottom;
          for (const l of e.labels || []) {
            const lr = l.getBoundingClientRect();
            if (lr.width === 0 && lr.height === 0) continue;
            x1 = Math.min(x1, lr.left); y1 = Math.min(y1, lr.top);
            x2 = Math.max(x2, lr.right); y2 = Math.max(y2, lr.bottom);
          }
          return {
            tag: e.tagName.toLowerCase(),
            w: Math.round(x2 - x1),
            h: Math.round(y2 - y1),
            // Radio buttons sharing a name are ONE tab stop by design — Tab enters the
            // group at the checked member, arrow keys move within it. Counting each as
            // its own required tab stop is wrong per the ARIA radiogroup pattern.
            radioGroup: e.type === "radio" ? e.name || "(unnamed)" : null,
            name:
              e.getAttribute("aria-label") ||
              e.getAttribute("aria-labelledby") ||
              e.textContent.trim() ||
              (e.labels && e.labels.length ? "label" : ""),
            srOnly: getComputedStyle(e).clipPath === "inset(50%)" || e.className.includes("sr-only"),
            // WCAG 2.5.5/2.5.8 "Inline" exception: a target inside a sentence, whose
            // size is constrained by the line-height of the surrounding text, is exempt.
            // Without this an ordinary prose link fails at 117x22 and the only way to
            // "pass" is to pad inline links to 44px — which breaks the paragraph and is
            // not what the criterion asks for.
            inlineInProse:
              e.tagName === "A" &&
              getComputedStyle(e).display === "inline" &&
              !!e.closest("p, li, blockquote, figcaption, dd"),
          };
        });
    });

    // Expected tab stops: every control, with each radio group counted once.
    const radioGroups = new Set(controls.filter((c) => c.radioGroup).map((c) => c.radioGroup));
    const expectedTabStops =
      controls.filter((c) => !c.radioGroup).length + radioGroups.size;
    for (const c of controls) {
      if (!c.name) fail(route, vp.name, "4.1.2", `<${c.tag}> has no accessible name`);
      // sr-only controls (the skip link when unfocused) and inline prose links are
      // exempt from target size — the latter by the criterion's own Inline exception.
      if (!c.srOnly && !c.inlineInProse && (c.w < 44 || c.h < 44))
        fail(route, vp.name, "2.5.5", `<${c.tag}> "${c.name.slice(0, 30)}" is ${c.w}x${c.h}, under 44x44`);
    }

    // ---- 2.4.1 skip link first in tab order, target exists ------------------------
    await page.keyboard.press("Tab");
    const first = await page.evaluate(() => {
      const a = document.activeElement;
      return {
        tag: a.tagName.toLowerCase(),
        href: a.getAttribute("href"),
        text: a.textContent.trim(),
        targetExists: a.getAttribute("href")?.startsWith("#")
          ? !!document.getElementById(a.getAttribute("href").slice(1))
          : null,
      };
    });
    if (first.href !== "#main-content")
      fail(route, vp.name, "2.4.1", `first tab stop is <${first.tag}> "${first.text}", not the skip link`);
    else if (!first.targetExists)
      fail(route, vp.name, "2.4.1", "skip link target #main-content does not exist");

    // ---- 2.4.7 visible focus indicator on the focused element ---------------------
    const focusStyle = await page.evaluate(() => {
      const s = getComputedStyle(document.activeElement);
      return { outline: s.outlineStyle, width: s.outlineWidth, shadow: s.boxShadow };
    });
    const hasIndicator =
      (focusStyle.outline !== "none" && parseFloat(focusStyle.width) > 0) ||
      (focusStyle.shadow && focusStyle.shadow !== "none");
    if (!hasIndicator)
      fail(route, vp.name, "2.4.7", "focused skip link has no visible focus indicator");

    // ---- 2.1.1 reachability + 2.1.2 no trap ---------------------------------------
    const expected = expectedTabStops;
    const seen = new Set();
    let escaped = false;
    for (let i = 0; i < expected + 12; i++) {
      const id = await page.evaluate(() => {
        const a = document.activeElement;
        if (!a || a === document.body) return "__BODY__";
        // Identity must be UNIQUE PER ELEMENT, not per label. An earlier version keyed
        // on tagName + aria-label/textContent; five range sliders with no aria-label all
        // collapsed to the same string, the Set deduped them, and the audit reported
        // "reached 2 of 6 controls" on a page with no reachability problem at all.
        // A structural path cannot collide.
        const path = [];
        for (let n = a; n && n.nodeType === 1 && n !== document.documentElement; n = n.parentElement) {
          const i = n.parentElement ? [...n.parentElement.children].indexOf(n) : 0;
          path.unshift(`${n.tagName}:${i}`);
        }
        return path.join(">");
      });
      if (id === "__BODY__") { escaped = true; break; }
      seen.add(id);
      await page.keyboard.press("Tab");
    }
    if (seen.size < expected)
      fail(route, vp.name, "2.1.1", `reached ${seen.size} of ${expected} tab stops by keyboard`);
    if (!escaped && seen.size >= expected + 1)
      fail(route, vp.name, "2.1.2", "focus never left the document — possible keyboard trap");

    console.log(
      `    ${controls.length} controls (${expected} tab stops), ${seen.size} reached, overflow ${overflow}px`,
    );
    // ---- S8: the decorative WebGL stage stays decorative ---------------------------
    // The backdrop on / and /about is a <canvas>. It is only safe because it is inert:
    // hidden from assistive tech, out of the tab order, and out of hit-testing. Those
    // are three separate attributes on one element and any of them can be dropped in an
    // edit without a single existing check noticing.
    const canvases = await page.evaluate(() =>
      [...document.querySelectorAll("canvas")].map((c) => ({
        ariaHidden: c.getAttribute("aria-hidden"),
        tabindex: c.getAttribute("tabindex"),
        role: c.getAttribute("role"),
        pointerEvents: getComputedStyle(c).pointerEvents,
      })),
    );
    for (const c of canvases) {
      if (c.ariaHidden !== "true")
        fail(route, vp.name, "S8", `canvas is not aria-hidden (got ${c.ariaHidden})`);
      if (c.tabindex !== null)
        fail(route, vp.name, "S8", `canvas carries tabindex="${c.tabindex}"`);
      if (c.role !== null) fail(route, vp.name, "S8", `canvas carries role="${c.role}"`);
      if (c.pointerEvents !== "none")
        fail(route, vp.name, "S8", `canvas pointer-events is ${c.pointerEvents}, not none`);
    }

    // ---- S9: every revealed block is actually visible once scrolled to --------------
    // The act panels reveal via scroll-driven CSS animation. If a rule ever escapes its
    // @supports/prefers-reduced-motion guard, or the animation-range stops matching, the
    // failure mode is content stuck at opacity 0 — invisible to a sighted visitor while
    // still present in the DOM, so pa11y and every text assertion pass regardless.
    //
    // Checked by scrolling each block into view, NOT by reading opacity where it sits:
    // a block below the fold is legitimately transparent, and asserting on that would
    // fail the pattern working exactly as designed.
    const revealCount = await page.evaluate(
      () => document.querySelectorAll(".reveal").length,
    );
    for (let i = 0; i < revealCount; i++) {
      const state = await page.evaluate((idx) => {
        const el = document.querySelectorAll(".reveal")[idx];
        el.scrollIntoView({ block: "center", behavior: "instant" });
        return null;
      }, i);
      void state;
      // Two frames: one for the scroll to commit, one for the timeline to resolve.
      await new Promise((r) => setTimeout(r, 120));
      const seen = await page.evaluate((idx) => {
        const el = document.querySelectorAll(".reveal")[idx];
        const cs = getComputedStyle(el);
        return {
          opacity: Number(cs.opacity),
          visibility: cs.visibility,
          name: el.querySelector("h1,h2")?.textContent?.trim() || "(unnamed)",
        };
      }, i);
      if (seen.opacity < 0.9 || seen.visibility === "hidden")
        fail(
          route,
          vp.name,
          "S9",
          `"${seen.name}" is still invisible when centred (opacity ${seen.opacity})`,
        );
    }
    await page.evaluate(() => window.scrollTo(0, 0));

    await page.close();
  }
}

await browser.close();

console.log("\n" + "=".repeat(64));
if (failures.length === 0) {
  console.log(`PASS: 0 failures across ${ROUTES.length} routes x ${VIEWPORTS.length} viewports.`);
  process.exit(0);
}
console.log(`FAIL: ${failures.length} failure(s):`);
for (const f of failures) console.log("  " + f);
process.exit(1);

# PROJECT_SUMMARY

Bespoke UX portfolio — Next.js 16 (App Router), Tailwind CSS 4, MDX case-study engine with
NDA build gates, WCAG 2.1 AA tooling, GitHub Actions QA pipeline.

Built from the instruction vault at
`~/Obsidian/TJ_Vault/UX_Design_Porforlio/ux-portfolio-vault/`. This repo is the artifact;
the vault is the instructions. **The repo never lives inside the Obsidian vault** (ADR-011).

## Status — honest

| Phase | State |
|---|---|
| 1 Architecture & Governance | Code complete. **Gate open**: GitHub push, branch protection, Vercel — all TJ. |
| 2 Narrative Case Engine | Engine complete + gate-proven. **Gate open**: zero case studies written. |
| 3 Interactive Visual Polish | 4 shared widgets done. **7 project widgets deferred** to 3b (they illustrate unwritten case studies). |
| 4 WCAG & Mobile QA | Tiers 1–2 automated and passing. **Tier 3 (VoiceOver) not started — TJ.** `useFocusTrap` not built (no overlays exist yet). |
| 5 Deploy & Pipelines | Pipeline, SEO surfaces, Lighthouse config done. **Deploy, domain, analytics, rollback drill — all TJ.** |

**No gate is signed.** Each requires evidence + commit SHA + human initials in the vault's
`STATUS.md`. Progress rows are recorded there; none is a pass.

## Architecture

```
src/
  app/
    layout.tsx            root: fonts (next/font), skip link, metadata + OG
    page.tsx              home: hero, DesignTokenInspector
    case-studies/
      page.tsx            index — lists published studies
      [slug]/page.tsx     SSG from published slugs; dynamicParams false
    design-system/        internal widget harness (noindex, robots-disallowed)
    sitemap.ts robots.ts opengraph-image.tsx
  components/
    widgets/              MetricsGrid, BeforeAfterSlider, DesignTokenInspector, FlowChartSimulator
    motion/Reveal.tsx     Framer Motion; opacity/transform only; honours reduced-motion
  lib/
    caseStudySchema.ts    Zod contract
    mdxLoader.ts          gray-matter + Zod + NDA gate + evaluate()
    mdxComponents.tsx     MDX widget registry (next/dynamic)
scripts/
  contrast-audit.mjs      WCAG contrast computed from tokens, both themes
  gen-pa11yci.mjs         derives .pa11yci.json from published slugs
  a11y-keyboard-audit.mjs tier-2: keyboard, focus, targets, viewports
content/case-studies/     MDX (currently: template only)
```

Content flows one way: `.mdx` → gray-matter → Zod → NDA blocklist scan → `evaluate()` →
RSC render. Any failure at any stage aborts the build.

## Build gates (all verified by probe, not assumed)

| Gate | Behaviour | Proven by |
|---|---|---|
| `ndaSanitized !== true` | build fails, names the field | probe |
| Blocklisted term in content | build fails, names the term | probe |
| Invalid/missing frontmatter | build fails loudly (never silently drops a study) | probe |
| MDX syntax error | build fails via the `evaluate()` error field | probe |
| Unregistered MDX component | build fails at prerender | probe |
| `.nda-blocklist` missing | CI fails | probe |
| `.nda-blocklist` all blanks/comments | CI fails (no false "clean") | probe |

## Accessibility

`npm run a11y` = contrast + pa11y-ci + tier-2 keyboard/viewport audit.

- Contrast: **20/20 token pairs pass** in both themes (6 real failures found and fixed — amendment A16).
- pa11y-ci WCAG2AA: **3/3 routes, 0 errors**.
- Tier 2: **0 failures** across 3 routes × 3 viewports (375/768/1280).
- Lighthouse accessibility category: **1.0**.

Both automated detectors were **negative-controlled** — injected violations, confirmed
caught, reverted. A green run from an unproven detector proves nothing.

**Not covered:** manual VoiceOver (tier 3) — the vault's own rules put automated coverage
at ~30–40%. And `/case-studies/<slug>` has **never been audited**, because no study is
published; the audit route list is derived from content, so it is currently empty.

## Web Vitals — measured 2026-07-28

| Metric | Target | Measured | Enforcement |
|---|---|---|---|
| Accessibility | 1.0 | **1.0** | error |
| SEO | ≥0.9 | pass | error |
| CLS | 0 | **0** | error |
| Performance | ≥0.98 | **0.91 / 0.94** | warn (ADR-013) |
| Initial JS | <100 KB | **200 KB brotli** on `/` | **not asserted** — see below |

Two targets are not met and are not being hidden:

1. **Initial JS.** Unachievable with this stack — a zero-widget route is 166 KB brotli.
   Decision open (ADR-014 / risk R19); rationale in `docs/PERFORMANCE-BUDGET.md`.
2. **Performance 0.91–0.94 vs 0.98.** Measured on localhost with no network latency, so
   this is a floor, not a pessimistic reading. Run-to-run variance was 0.85–0.94 across
   three runs of the same build — which is exactly why it asserts at `warn`.

## Commands

```bash
npm run dev            # develop
npm run build          # production build (all content gates run here)
npm run lint
npm run a11y           # contrast + pa11y-ci + keyboard/viewport
```

`npm run a11y` needs a running server (`npm start`) and `PA11Y_CHROME_PATH` pointing at a
working Chrome — puppeteer's bundled download truncates silently on macOS ARM.

**Never run `npm audit fix`** — npm resolves the advisory chain to `next@9.3.3`, a
six-major downgrade. See the dependency policy in `CLAUDE.md` (risk R18).

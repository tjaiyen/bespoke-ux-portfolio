# Product design portfolio — Theerayut Jaiyen

Enterprise B2B · manufacturing operations · financial systems.

A former manufacturing cost accountant who turns ERP and financial data into real-time
operational visibility tools. This repository is the portfolio itself: hand-built in
Next.js and TypeScript against a semantic design-token system, with the accessibility
checks running in CI rather than asserted in prose.

**Live:** <https://tjaiyen.github.io/bespoke-ux-portfolio>

---

## What's here

**Case studies** — five. Two built and shipped, three labelled concept explorations. The
distinction is enforced by the content schema rather than by convention: `projectType` and
`metricsBasis` are required fields with no default, so a study cannot ship without
declaring whether its figures were measured or modelled.

**Gallery** — 52 self-contained 3D sites, each publishing the conformance report from a
real accessibility gate run against the exact copy served here. 15 of them render finance
and manufacturing *instruments* rather than atmosphere: an 85% Wright learning slope,
earned value computed from the BCWS/BCWP/ACWP identities, a 3.06× wrap rate, a buy-to-fly
ratio measured off the geometry, borrowing-base carve-outs, three-way match.

**Design system** — live and inspectable at `/design-system`. Every colour is read from the
same CSS custom properties the components use.

## Verification

The site argues that claims should be checkable, so its own claims are checked
mechanically. `npm run a11y` runs three tiers, and CI runs the same commands:

- **Contrast** — all 32 token pairs computed offline, both themes, each against the ratio
  for its actual use (4.5:1 body text, 3:1 UI boundaries).
- **pa11y-ci** — axe over every route, WCAG 2.1 AA.
- **Tier 2** — a driven browser at 375 / 768 / 1280: keyboard reachability, no traps, skip
  link first in tab order, visible focus, 44×44 targets, no horizontal overflow, plus
  checks that the decorative WebGL backdrop stays inert and that scroll-revealed content is
  actually visible once scrolled to.

Routes are **derived from the filesystem**, never listed. A hardcoded route list silently
dropped pages from the audit four times; walking `src/app` plus the published slugs means a
new page is audited because it exists.

Every detector was verified by being made to fail first. A green run from an unproven check
is worth nothing — and this project produced several: a canvas render check that reported
failure for 47 correctly-rendering sites, an asset check that scanned only the entry page,
an image check that resolved the wrong file and passed.

## Running it

```bash
npm install
npm run dev            # http://localhost:3000
```

```bash
npm run build && npm start
npm run a11y           # contrast → chrome preflight → pa11y → tier 2 → sitemap
```

Node 22 (`.nvmrc`). **Never run `npm audit fix` here** — npm's advisory metadata resolves
the `next` chain to `next@9.3.3`, a six-major downgrade that destroys the App Router build.
The open advisories are all in the eslint / minimatch / postcss / sharp build-time chain;
the deployed site is a static export with no server runtime.

## Deploying

Static export, targeting either a GitHub Pages project site or a custom domain:

```bash
npm run build:static
npm run check:publish -- --base https://your-domain-or-pages-url
```

`check:publish` reads the exported bytes rather than the source, because the failures that
matter are only visible there: a site URL left unset bakes `localhost` into every `og:` tag
and the sitemap while the build stays green, and root-absolute asset paths 404 under a
Pages project path while the HTML still returns 200.

Deployment runs from `.github/workflows/deploy-pages.yml`, and is manual-only — publishing
is a decision, not a side effect of merging.

## Licence

No licence: all rights reserved. The case studies, design system and showcase sites are
work samples, not a library. Third-party notices are in
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

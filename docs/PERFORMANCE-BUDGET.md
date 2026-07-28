# Performance budget — why `resource-summary:script:size` is NOT asserted

The vault specifies a **<100 KB initial JS** budget asserted as a hard CI error
(`resource-summary:script:size` ≤ 102400). That assertion is deliberately absent from
`lighthouserc.json`. This file records why, so nobody "fixes" the omission by adding it back.

## Measured, 2026-07-28, production build

| Route | raw | gzip | brotli |
|---|---|---|---|
| `/case-studies` — **zero widgets** | 642 KB | 191 KB | **166 KB** |
| `/design-system` — 4 widgets | 636 KB | 189 KB | **164 KB** |
| `/` — token inspector + Framer Motion | 759 KB | 229 KB | **200 KB** |

A route rendering **no widgets at all** is already 66% over the budget. The floor is the
Next 16 App Router + React 19 client runtime, not portfolio code — so lazy-loading,
code-splitting, and tree-shaking cannot close the gap. Framer Motion contributes 34 KB
brotli; removing it entirely still misses by ~65%.

The number came from the source report as an aspiration and was never measured against
the stack the vault itself mandates.

## Why an impossible gate is worse than no gate

Asserting 102400 as `error` fails every PR forever, regardless of the diff. The
predictable response is to route around the perf check — which is exactly the
gate-blindness that demoting `categories:performance` to `warn` was meant to prevent
(ADR-013). A gate nobody can pass teaches people to ignore gates.

## What IS asserted

- `categories:accessibility` = 1.0 — **error**
- `categories:seo` ≥ 0.9 — **error**
- `cumulative-layout-shift` = 0 — **error**
- `unsized-images` — **error** (the mechanism that keeps CLS at 0)
- `categories:performance` ≥ 0.90 — **warn** (re-based ADR-010, 2026-07-28: fires only on
  real regression, not on every run; ≥ 0.98 retained as a stretch target)
- `budget.json` script budget 250 KB / total 700 KB — **warn**, set from today's
  measurement plus headroom. This is a *regression tripwire*, not the vault's target: it
  catches a dependency that doubles the bundle, without pretending 100 KB is reachable.

## Decision closed (ADR-014 + ADR-010 re-base, TJ, 2026-07-28)

The 100 KB absolute is abandoned — it was borrowed from the source report and never
measured against the mandated stack. The tripwire above IS the budget of record:
"no regression from measured baseline". The same decision closed the performance-score
side: after all in-spec work (hero LCP unwrap, `font-display: optional`, framer-motion
removal — ADR-015), the measured floor is home 0.89–0.95 median ~0.93, case-study
routes 0.94–0.96; the residual is the Next 16 + React 19 hydration floor (simulated
LCP ~2.8s), not portfolio code. `05-Checklists/Checklist-Web-Vitals.md` strikes the
"initial JS < 100 KB" item with a pointer to the ADR, so the history stays visible.

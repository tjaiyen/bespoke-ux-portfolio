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
- `categories:performance` ≥ 0.98 — **warn** (runner variance, ADR-013)
- `budget.json` script budget 250 KB / total 700 KB — **warn**, set from today's
  measurement plus headroom. This is a *regression tripwire*, not the vault's target: it
  catches a dependency that doubles the bundle, without pretending 100 KB is reachable.

## Open decision (ADR-014, risk R19)

TJ has not yet chosen the real number. Until then the tripwire above stands. The
recommendation in the ADR is to enforce "no regression from measured baseline" rather
than an absolute borrowed from a blog post. `05-Checklists/Checklist-Web-Vitals.md` keeps
"initial JS < 100 KB" as an explicitly unchecked item so the gap stays visible rather
than being quietly deleted.

# Accessibility Conformance Report

**Product:** mycelia
**Date:** 2026-07-29  ·  **Pages audited:** 1
**Method:** Blocksmith accessibility gate (real axe-core over the rendered DOM, headless Chrome), axe-core 4.10.2

## Result: PASS — provably passes the machine-testable criteria evaluated

## Scope & honest limitations
This report documents **verified** conformance to the machine-testable WCAG 2 Level A/AA success criteria that axe-core (4.10.2, wcag2a + wcag2aa rulesets) evaluates, plus Blocksmith structural invariants, run over the **rendered DOM** on 2026-07-29.

It is reproducible **evidence of an automated audit** — it is **not a claim of full WCAG conformance or legal compliance**.

Success criteria requiring human judgment (keyboard operation, focus order, screen-reader flow, motion pause/stop, cognitive load) were **NOT evaluated** and require manual review (listed below). Automated testing covers roughly the machine-detectable majority of real-world failures, not the whole of WCAG.

## WCAG 2 A/AA — machine-testable criteria (automated)
| Success Criterion | Level | Status | Notes |
|---|---|---|---|
| 1.1.1 Non-text Content | A | Partially Supports | No violations in the rendered DOM, but 1 <canvas> element(s) are aria-hidden by this gate's structural requirement — anything drawn inside them (including readable text or data) is outside automated scope and needs a manual text alternative. |
| 1.3.1 Info and Relationships | A | Supports | Automated verification passed; no violations. |
| 1.4.3 Contrast (Minimum) | AA | Supports | Automated verification passed; no violations. |
| 2.4.2 Page Titled | A | Supports | Automated verification passed; no violations. |
| 2.4.4 Link Purpose (In Context) | A | Supports | Automated verification passed; no violations. |
| 3.1.1 Language of Page | A | Supports | Automated verification passed; no violations. |
| 3.3.2 Labels or Instructions | A | Supports | Automated check passed (axe covers only the multiple-labels case (form-field-multiple-labels); missing labels/instructions require manual review). |
| 4.1.2 Name, Role, Value | A | Supports | Automated verification passed; no violations. |

## Blocksmith structural invariants (anti-gaming)
- ✓ Exactly one <h1> per page
- ✓ A <main> landmark, not hidden
- ✓ Self-contained CSP (no external origins)
- ✓ Real visible content (anti-gaming floor)
- ✓ Decorative <canvas> is aria-hidden
- ✓ Static under prefers-reduced-motion (WCAG 2.2.2 aspect)

## Not evaluated — require manual review
| Success Criterion | Level | Status | Notes |
|---|---|---|---|
| 1.3.5 Identify Input Purpose | AA | Not Evaluated | axe-core has no automated rule for this (autocomplete tokens on inputs) — requires manual review. |
| 1.4.10 Reflow | AA | Not Evaluated | Requires manual review — automation cannot verify this criterion. |
| 2.1.1 Keyboard | A | Not Evaluated | Requires manual review — automation cannot verify this criterion. |
| 2.2.2 Pause, Stop, Hide | A | Not Evaluated | The prefers-reduced-motion aspect IS verified (see structural invariants — static under reduced motion). Pause/stop/hide controls for other auto-updating content require manual review. |
| 2.4.3 Focus Order | A | Not Evaluated | Requires manual review — automation cannot verify this criterion. |
| 2.4.7 Focus Visible | AA | Not Evaluated | Requires manual review — automation cannot verify this criterion. |
| 3.2.3 Consistent Navigation | AA | Not Evaluated | Requires manual review — automation cannot verify this criterion. |

---
*Generated from a real axe-core audit by @blocksmith/audit. Re-run the gate to reproduce this evidence.*

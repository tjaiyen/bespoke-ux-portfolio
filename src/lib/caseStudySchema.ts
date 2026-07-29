import { z } from "zod";

export const CaseStudyMetric = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  change: z.string().min(1),
  /**
   * DIRECTION and GOODNESS are separate facts and must not share one field.
   *
   * `isPositive` alone drove the arrow glyph, so "-79% monthly close time" rendered an ▲
   * next to a negative number — six such conflicts shipped live. A reduction that is good
   * news still points DOWN. Screen-reader users were fine (the sr-only text said
   * "improvement"); sighted readers saw a contradiction on the most-scanned element in the
   * portfolio.
   *
   * `trend` is the arrow. `isPositive` is the colour and the spoken qualifier. Optional so
   * the field is additive rather than a breaking change; when absent it is inferred from
   * the sign of `value`, which is right for every metric currently written.
   */
  trend: z.enum(["up", "down", "flat"]).optional(),
  isPositive: z.boolean(),
});

/** Arrow direction: explicit `trend` if set, otherwise inferred from the value's sign. */
export function metricTrend(m: {
  value: string;
  trend?: "up" | "down" | "flat";
}): "up" | "down" | "flat" {
  if (m.trend) return m.trend;
  const v = m.value.trim();
  if (v.startsWith("-") || v.startsWith("\u2212")) return "down";
  if (v.startsWith("+")) return "up";
  return "flat";
}

/**
 * PROJECT TYPE IS REQUIRED AND HAS NO DEFAULT — deliberately.
 *
 * These case studies are composite concept work grounded in real domain experience, not
 * literal client engagements. They were originally published with `role: "Lead Product
 * Designer"`, specific overlapping date ranges, a named reporting line, and metrics stated
 * as measured outcomes. That framing would fail at the first interview follow-up.
 *
 * Making the field required with no default means a future study cannot quietly inherit
 * the wrong framing: the build fails until someone states which kind of work it is.
 */
export const projectTypeSchema = z.enum(["concept", "client", "self-directed"]);

/**
 * "self-directed" = real, built, shipped work with no commissioning client. It is NOT a
 * concept: the artefact exists, it ran, and its numbers were measured. Keeping it distinct
 * from both "concept" (nothing was built) and "client" (someone commissioned it) means the
 * UI can tell a reader exactly which of the three they are looking at, rather than blurring
 * real unpaid work into either category.
 */

/** Whether the reported figures were measured in production or modelled from assumptions. */
export const metricsBasisSchema = z.enum(["measured", "modelled"]);

export const caseStudySchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, "slug must be lowercase kebab-case"),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  client: z.string().min(1),
  role: z.string().min(1),
  timeline: z.string().min(1),
  projectType: projectTypeSchema,
  /** For concept work: the real experience the scenario is grounded in. Required — a
   *  concept with no stated basis is indistinguishable from an invention. */
  basis: z.string().min(30),
  metricsBasis: metricsBasisSchema,
  userResearchSummary: z
    .string()
    .min(50, "70/30 rule: substantive research summary required"),
  tradeOffAnalysis: z
    .string()
    .min(50, "70/30 rule: substantive trade-off analysis required"),
  businessImpactMetrics: z.array(CaseStudyMetric).min(1), // ADR-009: handoff naming
  heroImage: z.string().startsWith("/images/"),
  toolsUsed: z.array(z.string()).min(1),
  published: z.boolean(),
  ndaSanitized: z.literal(true), // build fails unless explicitly true
});

export type CaseStudyFrontmatter = z.infer<typeof caseStudySchema>;
export type CaseStudyMetricValue = z.infer<typeof CaseStudyMetric>;

import { z } from "zod";

export const CaseStudyMetric = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  change: z.string().min(1),
  isPositive: z.boolean(),
});

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
export const projectTypeSchema = z.enum(["concept", "client"]);

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

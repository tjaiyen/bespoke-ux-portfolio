import { z } from "zod";

export const CaseStudyMetric = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  change: z.string().min(1),
  isPositive: z.boolean(),
});

export const caseStudySchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, "slug must be lowercase kebab-case"),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  client: z.string().min(1),
  role: z.string().min(1),
  timeline: z.string().min(1),
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

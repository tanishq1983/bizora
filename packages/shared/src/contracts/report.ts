import { z } from 'zod';
import { phrase, score, text } from './common.js';

export const NEXT_STEP_CATEGORIES = ['validate', 'build', 'research', 'improve'] as const;
export type NextStepCategory = (typeof NEXT_STEP_CATEGORIES)[number];

export const NEXT_STEP_LABELS: Record<NextStepCategory, string> = {
  validate: 'Validate',
  build: 'Build',
  research: 'Research',
  improve: 'Improve',
};

export const nextStepSchema = z.object({
  title: phrase(120),
  detail: text(600),
  category: z.enum(NEXT_STEP_CATEGORIES),
});
export type NextStep = z.infer<typeof nextStepSchema>;

export const READINESS_BANDS = ['strong', 'promising', 'developing', 'early'] as const;
export type ReadinessBand = (typeof READINESS_BANDS)[number];

export const READINESS_BAND_COPY: Record<ReadinessBand, { label: string; tone: string; blurb: string }> = {
  strong: {
    label: 'Investor ready',
    tone: 'green',
    blurb: 'A credible, well-evidenced story. Focus on traction metrics.',
  },
  promising: {
    label: 'Promising',
    tone: 'blue',
    blurb: 'The opportunity is clear. Tighten the proof points before a raise.',
  },
  developing: {
    label: 'Developing',
    tone: 'purple',
    blurb: 'Fundamentals are forming. Investors will probe the weak spots.',
  },
  early: {
    label: 'Early stage',
    tone: 'amber',
    blurb: 'Significant gaps to close before this is fundable.',
  },
};

/* ── Model-facing shape ──────────────────────────────────────────────────── */

export const reportNarrativeAiSchema = z.object({
  strengths: z.array(text(400)).min(3).max(5),
  weaknesses: z.array(text(400)).min(3).max(5),
  suggestions: z.array(text(500)).min(2).max(3),
  overallFeedback: text(1500),
  nextSteps: z.array(nextStepSchema).min(3).max(6),
});
export type ReportNarrative = z.infer<typeof reportNarrativeAiSchema>;

/* ── Persisted report ────────────────────────────────────────────────────── */

export const reportSchema = reportNarrativeAiSchema.extend({
  investorReadinessScore: score(100),
  readinessBand: z.enum(READINESS_BANDS),
  /** Makes the headline score auditable rather than a black box. */
  scoreBreakdown: z.object({
    builderContribution: score(100),
    answerContribution: score(100),
    builderWeight: z.number(),
    answerWeight: z.number(),
  }),
  generatedAt: z.string(),
  degraded: z.boolean(),
});
export type InvestorReport = z.infer<typeof reportSchema>;
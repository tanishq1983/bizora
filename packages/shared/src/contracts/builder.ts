import { z } from 'zod';
import { ESTIMATE_DISCLAIMER, bullets, costRange, phrase, score, text } from './common.js';

/* ── 1. Business profile ─────────────────────────────────────────────────── */

export const businessProfileSchema = z.object({
  problem: text(),
  solution: text(),
  targetUsers: bullets(1, 8),
  valueProposition: text(),
  businessModel: text(),
});
export type BusinessProfile = z.infer<typeof businessProfileSchema>;

/* ── 2. Market opportunity ───────────────────────────────────────────────── */

export const marketOpportunitySchema = z.object({
  targetMarket: text(),
  marketNeed: text(),
  opportunity: text(),
  growthAreas: bullets(1, 6),
});
export type MarketOpportunity = z.infer<typeof marketOpportunitySchema>;

/* ── 3. Competitor snapshot ──────────────────────────────────────────────── */

export const competitorSchema = z.object({
  name: phrase(120),
  strengths: bullets(1, 5),
  gaps: bullets(1, 5),
});
export type Competitor = z.infer<typeof competitorSchema>;

export const competitorSnapshotSchema = z.object({
  competitors: z.array(competitorSchema).min(2).max(6),
  differentiation: text(),
});
export type CompetitorSnapshot = z.infer<typeof competitorSnapshotSchema>;

/* ── 4. Scores ───────────────────────────────────────────────────────────── */

export const SCORE_KEYS = [
  'marketPotential',
  'problemSolutionFit',
  'innovation',
  'feasibility',
  'revenuePotential',
] as const;
export type ScoreKey = (typeof SCORE_KEYS)[number];

export const SCORE_LABELS: Record<ScoreKey, string> = {
  marketPotential: 'Market Potential',
  problemSolutionFit: 'Problem–Solution Fit',
  innovation: 'Innovation',
  feasibility: 'Feasibility',
  revenuePotential: 'Revenue Potential',
};

/** The five sub-scores the model is allowed to produce. `overall` is computed, never generated. */
export const subScoresSchema = z.object({
  marketPotential: score(100),
  problemSolutionFit: score(100),
  innovation: score(100),
  feasibility: score(100),
  revenuePotential: score(100),
});
export type SubScores = z.infer<typeof subScoresSchema>;

/** What the dashboard reads: the five sub-scores plus the server-computed overall. */
export const scoresSchema = subScoresSchema.extend({ overall: score(100) });
export type Scores = z.infer<typeof scoresSchema>;

/* ── 5. MVP roadmap ──────────────────────────────────────────────────────── */

export const roadmapPhaseSchema = z.object({
  phase: phrase(60),
  title: phrase(120),
  duration: phrase(60),
  focus: text(600),
  deliverables: bullets(2, 6),
  keyRisks: bullets(1, 4),
});
export type RoadmapPhase = z.infer<typeof roadmapPhaseSchema>;

export const mvpRoadmapSchema = z.object({
  phases: z.array(roadmapPhaseSchema).length(3),
});
export type MvpRoadmap = z.infer<typeof mvpRoadmapSchema>;

/* ── 6. Cost & revenue ───────────────────────────────────────────────────── */

export const costRevenueSchema = z.object({
  developmentCost: costRange,
  operatingCost: costRange,
  revenueStreams: bullets(1, 6),
  monetizationModel: text(),
});
export type CostRevenue = z.infer<typeof costRevenueSchema>;

/* ── Assembled analysis ──────────────────────────────────────────────────── */

/**
 * The exact shape requested from the model. `scores` deliberately omits
 * `overall`, which is computed in shared/scoring.ts so the headline number can
 * never disagree with the components it is derived from.
 */
export const builderAiOutputSchema = z.object({
  startupName: phrase(80),
  summary: text(900),
  businessProfile: businessProfileSchema,
  marketOpportunity: marketOpportunitySchema,
  competitors: competitorSnapshotSchema,
  scores: subScoresSchema,
  mvpRoadmap: mvpRoadmapSchema,
  costRevenue: costRevenueSchema,
});
export type BuilderAiOutput = z.infer<typeof builderAiOutputSchema>;

/** Persisted and returned to the dashboard. */
export const builderAnalysisSchema = builderAiOutputSchema.extend({
  scores: scoresSchema,
  estimateNotice: z.string(),
  /** True when the reply came from the fallback provider or needed repair. */
  degraded: z.boolean(),
});
export type BuilderAnalysis = z.infer<typeof builderAnalysisSchema>;

export { ESTIMATE_DISCLAIMER };
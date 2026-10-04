import type { Scores, SubScores } from './contracts/builder.js';
import { EVALUATION_DIMENSIONS, type EvaluationDimension, type Metric } from './contracts/investor.js';
import { READINESS_BANDS, type ReadinessBand } from './contracts/report.js';

/**
 * Score weights. The overall startup score is a weighted mean rather than a
 * number the model writes, so the headline figure is always reproducible from
 * the five sub-scores shown directly beneath it.
 *
 * Weights favour the two things that most reliably separate a fundable idea
 * from a plausible one: real demand (market + fit) and whether it can actually
 * be built and monetised (feasibility + revenue). Innovation is rewarded but
 * deliberately not allowed to dominate.
 */
export const SCORE_WEIGHTS: Record<keyof SubScores, number> = {
  marketPotential: 0.25,
  problemSolutionFit: 0.2,
  innovation: 0.15,
  feasibility: 0.2,
  revenuePotential: 0.2,
};

/** How much of the final investor-readiness score comes from the idea vs. the founder's answers. */
export const READINESS_WEIGHTS = {
  builder: 0.4,
  answer: 0.6,
} as const;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const round1 = (value: number): number => Math.round(value * 10) / 10;

/** Weighted mean of the five sub-scores, rounded to a whole number for display. */
export function computeOverallScore(scores: SubScores): number {
  let total = 0;
  for (const key of Object.keys(SCORE_WEIGHTS) as (keyof SubScores)[]) {
    const value = scores[key];
    if (typeof value !== 'number' || Number.isNaN(value)) continue;
    total += clamp(value, 0, 100) * SCORE_WEIGHTS[key];
  }
  return clamp(Math.round(total), 0, 100);
}

export function withOverallScore(scores: SubScores): Scores {
  return { ...scores, overall: computeOverallScore(scores) };
}

/** Mean of a single answer's three dimensions, on the 0–10 scale. */
export function computeAnswerAverage(scores: Partial<Record<EvaluationDimension, number>>): number {
  const values = EVALUATION_DIMENSIONS.map((key) => scores[key]).filter(
    (value): value is number => typeof value === 'number' && !Number.isNaN(value),
  );
  if (values.length === 0) return 0;
  return round1(values.reduce((sum, value) => sum + clamp(value, 0, 10), 0) / values.length);
}

export interface ReadinessBreakdown {
  investorReadinessScore: number;
  builderContribution: number;
  answerContribution: number;
  builderWeight: number;
  answerWeight: number;
  averageAnswerScore: number;
}

/**
 * Investor readiness blends the strength of the idea (Builder Agent) with how
 * well the founder actually argued it (Investor Agent). Answers carry more
 * weight than the analysis: a good idea explained badly is not fundable.
 */
export function computeReadiness(
  builderOverall: number,
  answerMetrics: readonly Record<EvaluationDimension, Metric>[],
): ReadinessBreakdown {
  const builder = clamp(builderOverall, 0, 100);

  const perAnswer = answerMetrics.map((m) =>
    computeAnswerAverage({
      clarity: m.clarity?.score,
      marketUnderstanding: m.marketUnderstanding?.score,
      financialReasoning: m.financialReasoning?.score,
    }),
  );
  const meanAnswerOutOf10 = perAnswer.length
    ? perAnswer.reduce((sum, value) => sum + value, 0) / perAnswer.length
    : 0;
  const answerOutOf100 = clamp(meanAnswerOutOf10 * 10, 0, 100);

  const builderContribution = round1(builder * READINESS_WEIGHTS.builder);
  const answerContribution = round1(answerOutOf100 * READINESS_WEIGHTS.answer);
  const total = clamp(Math.round(builderContribution + answerContribution), 0, 100);

  return {
    investorReadinessScore: total,
    builderContribution,
    answerContribution,
    builderWeight: READINESS_WEIGHTS.builder,
    answerWeight: READINESS_WEIGHTS.answer,
    averageAnswerScore: round1(meanAnswerOutOf10),
  };
}

export function readinessBand(score: number): ReadinessBand {
  const value = clamp(score, 0, 100);
  if (value >= 80) return READINESS_BANDS[0];
  if (value >= 65) return READINESS_BANDS[1];
  if (value >= 45) return READINESS_BANDS[2];
  return READINESS_BANDS[3];
}

/** 0–1 ratio for progress bars and ring strokes. */
export function toRatio(score: number, max = 100): number {
  return clamp(score / max, 0, 1);
}

/**
 * Qualitative read on a score, used for the coloured labels under each ring so
 * a number is never shown without context.
 */
export function scoreBand(score: number, max = 100): 'strong' | 'solid' | 'mixed' | 'weak' {
  const ratio = toRatio(score, max);
  if (ratio >= 0.8) return 'strong';
  if (ratio >= 0.65) return 'solid';
  if (ratio >= 0.45) return 'mixed';
  return 'weak';
}
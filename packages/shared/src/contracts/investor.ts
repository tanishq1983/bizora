import { z } from 'zod';
import { phrase, score, text } from './common.js';
import { INVESTOR_QUESTIONS, type InvestorQuestionKey } from '../investor-questions.js';

export type { InvestorQuestionKey };

export const SESSION_STATUSES = ['not_started', 'in_progress', 'completed'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

/* ── Per-answer evaluation ───────────────────────────────────────────────── */

export const EVALUATION_DIMENSIONS = ['clarity', 'marketUnderstanding', 'financialReasoning'] as const;
export type EvaluationDimension = (typeof EVALUATION_DIMENSIONS)[number];

export const DIMENSION_LABELS: Record<EvaluationDimension, string> = {
  clarity: 'Clarity',
  marketUnderstanding: 'Market Understanding',
  financialReasoning: 'Financial Reasoning',
};

export const DIMENSION_BLURBS: Record<EvaluationDimension, string> = {
  clarity: 'Is the answer structured, specific and easy to follow?',
  marketUnderstanding: 'Does the answer show evidence of real customer demand?',
  financialReasoning: 'Does the answer connect the opportunity to sustainable revenue?',
};

/** One scored dimension with a critique and a concrete improvement. */
export const metricSchema = z.object({
  score: score(10),
  explanation: text(600),
  improvement: text(600),
});
export type Metric = z.infer<typeof metricSchema>;

/** Model-facing shape — `averageScore` is computed server-side. */
export const answerEvaluationAiSchema = z.object({
  clarity: metricSchema,
  marketUnderstanding: metricSchema,
  financialReasoning: metricSchema,
  /** One-line cross-cutting critique of the answer as a whole. */
  verdict: text(500),
});
export type AnswerEvaluationAi = z.infer<typeof answerEvaluationAiSchema>;

export const answerEvaluationSchema = answerEvaluationAiSchema.extend({
  averageScore: z.number().min(0).max(10),
});
export type AnswerEvaluation = z.infer<typeof answerEvaluationSchema>;

/* ── Stored founder response ─────────────────────────────────────────────── */

export const responseSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  questionKey: z.enum(['why_now', 'competitive_advantage', 'customer_acquisition']),
  question: phrase(300),
  answer: text(6000),
  clarityScore: score(10),
  marketUnderstandingScore: score(10),
  financialReasoningScore: score(10),
  feedback: answerEvaluationSchema,
  createdAt: z.string(),
});
export type FounderResponse = z.infer<typeof responseSchema>;

/* ── Session ─────────────────────────────────────────────────────────────── */

export const investorQuestionSchema = z.object({
  key: z.enum(['why_now', 'competitive_advantage', 'customer_acquisition']),
  index: z.number().int().min(1).max(3),
  title: phrase(120),
  prompt: text(600),
  lookingFor: text(600),
});
export type InvestorQuestion = z.infer<typeof investorQuestionSchema>;

export const investorSessionSchema = z.object({
  id: z.string(),
  startupId: z.string(),
  status: z.enum(SESSION_STATUSES),
  questions: z.array(investorQuestionSchema).length(3),
  currentIndex: z.number().int().min(0).max(3),
  responses: z.array(responseSchema),
  createdAt: z.string(),
});
export type InvestorSession = z.infer<typeof investorSessionSchema>;

export { INVESTOR_QUESTIONS };
import type {
  AnswerEvaluationAi,
  BuilderAiOutput,
  BuilderAnalysis,
  InvestorQuestionDefinition,
  ReportNarrative,
  SubScores,
} from '@bizora/shared';
import type { AiProviderName } from '../config/env.js';

export interface AgentResult<T> {
  data: T;
  degraded: boolean;
  provider: AiProviderName;
}

export interface BuilderAgentInput {
  idea: string;
}

export interface AnswerAgentInput {
  idea: string;
  startupName: string;
  analysis: BuilderAnalysis;
  question: InvestorQuestionDefinition;
  answer: string;
}

export interface ReportAgentInput {
  idea: string;
  startupName: string;
  analysis: BuilderAnalysis;
  responses: readonly {
    question: InvestorQuestionDefinition;
    answer: string;
    evaluation: AnswerEvaluationAi;
  }[];
  /** Computed server-side and handed to the model so its prose agrees with the score. */
  readiness: {
    investorReadinessScore: number;
    builderContribution: number;
    answerContribution: number;
    averageAnswerScore: number;
  };
}

/**
 * The AI boundary. Everything above this interface is deterministic: scoring,
 * storage, and the workflow. Everything below it is a model that may be slow,
 * wrong, or unavailable.
 */
export interface AiProvider {
  readonly name: AiProviderName;
  buildAnalysis(input: BuilderAgentInput): Promise<AgentResult<BuilderAiOutput>>;
  evaluateAnswer(input: AnswerAgentInput): Promise<AgentResult<AnswerEvaluationAi>>;
  buildReport(input: ReportAgentInput): Promise<AgentResult<ReportNarrative>>;
}

export type { SubScores };
import {
  INVESTOR_QUESTIONS,
  MIN_ANSWER_LENGTH,
  TOTAL_QUESTIONS,
  computeAnswerAverage,
  getQuestion,
  questionKeyAtIndex,
  type AnswerEvaluation,
  type CreateSessionResponse,
  type FounderResponse,
  type InvestorQuestion,
  type InvestorQuestionKey,
  type SubmitAnswerResponse,
} from '@bizora/shared';
import type { AiProvider } from '../ai/provider.js';
import { errors } from '../core/errors.js';
import { createLogger } from '../core/logger.js';
import type { DataStore } from '../data/store.js';
import type { AnalysisRow, ResponseRow, SessionRow, StartupRow } from '../data/store.js';

const log = createLogger('service:investor');

const publicQuestions: InvestorQuestion[] = INVESTOR_QUESTIONS.map((question) => ({
  key: question.key,
  index: question.index,
  title: question.title,
  prompt: question.prompt,
  lookingFor: question.lookingFor,
}));

function toPublicResponse(row: ResponseRow): FounderResponse {
  return {
    id: row.id,
    sessionId: row.sessionId,
    questionKey: row.questionKey,
    question: row.question,
    answer: row.answer,
    clarityScore: row.clarityScore,
    marketUnderstandingScore: row.marketUnderstandingScore,
    financialReasoningScore: row.financialReasoningScore,
    feedback: row.feedback,
    createdAt: row.createdAt,
  };
}

/**
 * Investor Agent Service.
 *
 * The interview is a fixed sequence, not a conversation. That is the product
 * decision: identical questions for every founder means scores are comparable
 * and the report can attribute weakness to a specific question.
 */
export class InvestorService {
  constructor(
    private readonly ai: AiProvider,
    private readonly store: DataStore,
  ) {}

  /* ── session lifecycle ─────────────────────────────────────────────────── */

  async startSession(userId: string, startupId: string): Promise<CreateSessionResponse> {
    // Ownership is the point of this call; the startup itself is not needed yet.
    await this.requireOwnedStartup(userId, startupId);

    // The interview only makes sense once the Builder Agent has run.
    const analysis = await this.store.findLatestAnalysis(startupId);
    if (!analysis) throw errors.analysisMissing();

    const existing = await this.store.findLatestSession(startupId);
    if (existing) {
      const responses = await this.store.listResponses(existing.id);
      if (existing.status !== 'completed' && responses.length < TOTAL_QUESTIONS) {
        // Resume rather than discard the founder's work.
        return this.toCreateResponse(existing, responses);
      }
      if (existing.status === 'completed') {
        const responses = await this.store.listResponses(existing.id);
        return this.toCreateResponse(existing, responses);
      }
    }

    const session = await this.store.createSession({ startupId, userId });
    log.info('investor session created', { sessionId: session.id, startupId });

    return this.toCreateResponse(session, []);
  }

  async getSession(userId: string, sessionId: string): Promise<CreateSessionResponse> {
    const session = await this.requireOwnedSession(userId, sessionId);
    const responses = await this.store.listResponses(sessionId);
    return this.toCreateResponse(session, responses);
  }

  /* ── answering ─────────────────────────────────────────────────────────── */

  async submitAnswer(
    userId: string,
    sessionId: string,
    questionKey: InvestorQuestionKey,
    rawAnswer: string,
  ): Promise<SubmitAnswerResponse> {
    const session = await this.requireOwnedSession(userId, sessionId);
    const startup = await this.requireOwnedStartup(userId, session.startupId);

    const answer = rawAnswer?.trim() ?? '';
    if (answer.length === 0) throw errors.answerEmpty();
    if (answer.length < MIN_ANSWER_LENGTH) {
      throw errors.answerTooShort(`That answer is too short to evaluate credibly. Add a specific example or number — aim for at least ${MIN_ANSWER_LENGTH} characters.`);
    }

    const existing = await this.store.findResponseByQuestion(sessionId, questionKey);
    if (existing) throw errors.duplicateAnswer();

    const responses = await this.store.listResponses(sessionId);
    const expectedKey = questionKeyAtIndex(responses.length);
    if (expectedKey && expectedKey !== questionKey) {
      throw errors.questionOutOfOrder(
        'Answer the questions in order — question ' +
          `${responses.length + 1} of ${TOTAL_QUESTIONS} is next.`,
      );
    }

    const analysis = await this.store.findLatestAnalysis(session.startupId);
    if (!analysis) throw errors.analysisMissing();

    const question = getQuestion(questionKey);
    const result = await this.ai.evaluateAnswer({
      idea: startup.idea,
      startupName: analysis.analysis.startupName,
      analysis: analysis.analysis,
      question,
      answer,
    });

    const evaluation: AnswerEvaluation = {
      ...result.data,
      averageScore: computeAnswerAverage({
        clarity: result.data.clarity.score,
        marketUnderstanding: result.data.marketUnderstanding.score,
        financialReasoning: result.data.financialReasoning.score,
      }),
    };

    const stored = await this.store.createResponse({
      sessionId,
      questionKey,
      question: question.title,
      answer,
      clarityScore: evaluation.clarity.score,
      marketUnderstandingScore: evaluation.marketUnderstanding.score,
      financialReasoningScore: evaluation.financialReasoning.score,
      feedback: evaluation,
    });

    const updated = await this.store.listResponses(sessionId);
    const complete = updated.length >= TOTAL_QUESTIONS;
    const status = complete ? 'completed' : 'in_progress';

    if (session.status !== status) {
      await this.store.updateSessionStatus(sessionId, status);
    }

    log.info('answer evaluated', {
      sessionId,
      questionKey,
      average: evaluation.averageScore,
      degraded: result.degraded,
    });

    return {
      sessionId,
      questionKey,
      evaluation,
      currentIndex: Math.min(updated.length, TOTAL_QUESTIONS),
      status,
      readyForReport: complete,
      response: toPublicResponse(stored),
    };
  }

  /* ── helpers ───────────────────────────────────────────────────────────── */

  private toCreateResponse(session: SessionRow, responses: ResponseRow[]): CreateSessionResponse {
    return {
      sessionId: session.id,
      startupId: session.startupId,
      status: session.status,
      questions: publicQuestions,
      currentIndex: Math.min(responses.length, TOTAL_QUESTIONS),
      responses: responses.map(toPublicResponse),
    };
  }

  private async requireOwnedStartup(userId: string, startupId: string): Promise<StartupRow> {
    const startup = await this.store.findStartupForUser(startupId, userId);
    if (!startup) throw errors.startupNotFound();
    return startup;
  }

  private async requireOwnedSession(userId: string, sessionId: string): Promise<SessionRow> {
    const session = await this.store.findSession(sessionId);
    if (!session) throw errors.sessionNotFound();
    if (session.userId !== userId) throw errors.sessionNotFound();
    return session;
  }

  /** Used by the report service — returns the analysis behind a session. */
  async requireAnalysis(startupId: string): Promise<AnalysisRow> {
    const analysis = await this.store.findLatestAnalysis(startupId);
    if (!analysis) throw errors.analysisMissing();
    return analysis;
  }
}
import {
  TOTAL_QUESTIONS,
  computeReadiness,
  getQuestion,
  readinessBand,
  type GenerateReportResponse,
  type InvestorReport,
} from '@bizora/shared';
import type { AiProvider } from '../ai/provider.js';
import { errors } from '../core/errors.js';
import { createLogger } from '../core/logger.js';
import type { DataStore } from '../data/store.js';
import type { ResponseRow } from '../data/store.js';

const log = createLogger('service:report');

/**
 * Report Service.
 *
 * Combines three sources — the Builder Agent analysis, the Investor Agent
 * evaluations and the founder's actual answers — into one assessment.
 *
 * The headline score is computed from those inputs before the model is called,
 * and the computed value is handed to the model as ground truth. The model
 * writes the narrative; it does not decide the number.
 */
export class ReportService {
  constructor(
    private readonly ai: AiProvider,
    private readonly store: DataStore,
  ) {}

  async generate(userId: string, startupId: string): Promise<GenerateReportResponse> {
    const startup = await this.store.findStartupForUser(startupId, userId);
    if (!startup) throw errors.startupNotFound();

    const analysisRow = await this.store.findLatestAnalysis(startupId);
    if (!analysisRow) throw errors.analysisMissing();

    const session = await this.store.findLatestSession(startupId);
    if (!session) throw errors.incompleteSession('Start the investor interview before generating the report.');

    const responses = await this.store.listResponses(session.id);
    if (responses.length < TOTAL_QUESTIONS) {
      throw errors.incompleteSession(
        `Answer all three investor questions before generating the report — ${responses.length} of ${TOTAL_QUESTIONS} complete.`,
      );
    }

    const readiness = computeReadiness(
      analysisRow.analysis.scores.overall,
      responses.map((row) => row.feedback),
    );

    const result = await this.ai.buildReport({
      idea: startup.idea,
      startupName: analysisRow.analysis.startupName,
      analysis: analysisRow.analysis,
      responses: responses.map((row: ResponseRow) => ({
        question: getQuestion(row.questionKey),
        answer: row.answer,
        evaluation: row.feedback,
      })),
      readiness: {
        investorReadinessScore: readiness.investorReadinessScore,
        builderContribution: readiness.builderContribution,
        answerContribution: readiness.answerContribution,
        averageAnswerScore: readiness.averageAnswerScore,
      },
    });

    const report: InvestorReport = {
      ...result.data,
      investorReadinessScore: readiness.investorReadinessScore,
      readinessBand: readinessBand(readiness.investorReadinessScore),
      scoreBreakdown: {
        builderContribution: Math.round(readiness.builderContribution),
        answerContribution: Math.round(readiness.answerContribution),
        builderWeight: readiness.builderWeight,
        answerWeight: readiness.answerWeight,
      },
      generatedAt: new Date().toISOString(),
      degraded: result.degraded,
    };

    const stored = await this.store.createReport({
      startupId,
      investorReadinessScore: report.investorReadinessScore,
      strengths: report.strengths,
      weaknesses: report.weaknesses,
      suggestions: report.suggestions,
      overallFeedback: report.overallFeedback,
      nextSteps: report.nextSteps,
      payload: report,
    });

    log.info('report generated', {
      startupId,
      readiness: report.investorReadinessScore,
      band: report.readinessBand,
      provider: result.provider,
    });

    return {
      startupId,
      reportId: stored.id,
      report,
      provider: result.provider,
      degraded: result.degraded,
    };
  }

  async get(userId: string, startupId: string): Promise<GenerateReportResponse> {
    const startup = await this.store.findStartupForUser(startupId, userId);
    if (!startup) throw errors.startupNotFound();

    const stored = await this.store.findLatestReport(startupId);
    if (!stored) throw errors.reportNotFound();

    return {
      startupId,
      reportId: stored.id,
      report: stored.payload,
      provider: stored.payload.degraded ? 'mock' : 'gemini',
      degraded: stored.payload.degraded,
    };
  }

  /** Accepts either a startup id or a report id, so the route is forgiving. */
  async getByIdentifier(userId: string, identifier: string): Promise<GenerateReportResponse> {
    if (await this.store.findStartupForUser(identifier, userId)) {
      return this.get(userId, identifier);
    }

    for (const startup of await this.store.listStartupsForUser(userId)) {
      const report = await this.store.findLatestReport(startup.id);
      if (report?.id === identifier) return this.get(userId, startup.id);
    }

    throw errors.reportNotFound();
  }
}
import {
  ESTIMATE_DISCLAIMER,
  validateIdea,
  withOverallScore,
  type AnalyzeIdeaResponse,
  type BuilderAnalysis,
} from '@bizora/shared';
import type { AiProvider } from '../ai/provider.js';
import { errors } from '../core/errors.js';
import { createLogger } from '../core/logger.js';
import type { DataStore } from '../data/store.js';
import type { AnalysisRow, StartupRow } from '../data/store.js';

const log = createLogger('service:builder');

export interface BuilderResult {
  startup: StartupRow;
  analysis: AnalysisRow;
  degraded: boolean;
  provider: 'gemini' | 'mock';
}

/**
 * Idea Service + Builder Agent Service.
 *
 * The ordering matters: the idea is validated before any AI call is made, and
 * the overall score is computed here rather than accepted from the model, so the
 * number on the dashboard is always reproducible from the five scores above it.
 */
export class BuilderService {
  constructor(
    private readonly ai: AiProvider,
    private readonly store: DataStore,
  ) {}

  async analyzeIdea(userId: string, rawIdea: unknown): Promise<AnalyzeIdeaResponse> {
    const validation = validateIdea(rawIdea);
    if (!validation.ok) throw errors.ideaTooShort(validation.message);

    const idea = validation.idea;
    log.info('analysing idea', { userId, length: idea.length });

    const result = await this.ai.buildAnalysis({ idea });

    const analysis: BuilderAnalysis = {
      ...result.data,
      scores: withOverallScore(result.data.scores),
      estimateNotice: ESTIMATE_DISCLAIMER,
      degraded: result.degraded,
    };

    const startup = await this.store.createStartup({
      userId,
      idea,
      startupName: analysis.startupName,
    });

    const analysisRow = await this.store.createAnalysis({ startupId: startup.id, analysis });

    log.info('analysis stored', {
      startupId: startup.id,
      overall: analysis.scores.overall,
      provider: result.provider,
      degraded: result.degraded,
    });

    return {
      startupId: startup.id,
      analysisId: analysisRow.id,
      startupName: analysis.startupName,
      analysis,
      provider: result.provider,
      degraded: result.degraded,
    };
  }

  /** Re-runs the Builder Agent on an existing startup, keeping the same record. */
  async reanalyze(userId: string, startupId: string): Promise<AnalyzeIdeaResponse> {
    const startup = await this.requireOwnedStartup(userId, startupId);

    const result = await this.ai.buildAnalysis({ idea: startup.idea });
    const analysis: BuilderAnalysis = {
      ...result.data,
      scores: withOverallScore(result.data.scores),
      estimateNotice: ESTIMATE_DISCLAIMER,
      degraded: result.degraded,
    };

    const analysisRow = await this.store.createAnalysis({ startupId, analysis });
    await this.store.updateStartupName(startupId, analysis.startupName);

    return {
      startupId,
      analysisId: analysisRow.id,
      startupName: analysis.startupName,
      analysis,
      provider: result.provider,
      degraded: result.degraded,
    };
  }

  async getAnalysis(userId: string, analysisId: string) {
    const analysis = await this.store.findAnalysis(analysisId);
    if (!analysis) throw errors.analysisNotFound();

    const startup = await this.store.findStartup(analysis.startupId);
    if (!startup || startup.userId !== userId) throw errors.analysisNotFound();

    return { startup, analysis };
  }

  async getLatestAnalysis(userId: string, startupId: string) {
    await this.requireOwnedStartup(userId, startupId);
    const analysis = await this.store.findLatestAnalysis(startupId);
    if (!analysis) throw errors.analysisNotFound();
    return analysis;
  }

  private async requireOwnedStartup(userId: string, startupId: string): Promise<StartupRow> {
    const startup = await this.store.findStartupForUser(startupId, userId);
    if (!startup) throw errors.startupNotFound();
    return startup;
  }
}
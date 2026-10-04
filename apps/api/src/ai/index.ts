import { capabilities, type AiProviderName } from '../config/env.js';
import { createLogger } from '../core/logger.js';
import { GeminiProvider } from './gemini.provider.js';
import { MockProvider } from './mock/mock.provider.js';
import type { AiProvider } from './provider.js';

const log = createLogger('ai');

/**
 * When Gemini is the primary provider it is wrapped in a fallback so a quota
 * error, a schema failure or a network outage degrades the response instead of
 * ending the demo. The service layer marks such results `degraded` and the UI
 * discloses it — the founder is told, not misled.
 */
class FallbackProvider implements AiProvider {
  readonly name: AiProviderName = 'gemini';

  constructor(
    private readonly primary: AiProvider,
    private readonly fallback: AiProvider,
  ) {}

  private async attempt<T>(
    label: string,
    primaryRun: () => Promise<T>,
    fallbackRun: () => Promise<T>,
  ): Promise<T> {
    try {
      return await primaryRun();
    } catch (error) {
      log.warn('gemini call failed, using fallback provider', {
        label,
        reason: error instanceof Error ? error.message : String(error),
      });
      return fallbackRun();
    }
  }

  async buildAnalysis(input: Parameters<AiProvider['buildAnalysis']>[0]) {
    return this.attempt('buildAnalysis', () => this.primary.buildAnalysis(input), async () => {
      const result = await this.fallback.buildAnalysis(input);
      return { ...result, degraded: true };
    });
  }

  async evaluateAnswer(input: Parameters<AiProvider['evaluateAnswer']>[0]) {
    return this.attempt('evaluateAnswer', () => this.primary.evaluateAnswer(input), async () => {
      const result = await this.fallback.evaluateAnswer(input);
      return { ...result, degraded: true };
    });
  }

  async buildReport(input: Parameters<AiProvider['buildReport']>[0]) {
    return this.attempt('buildReport', () => this.primary.buildReport(input), async () => {
      const result = await this.fallback.buildReport(input);
      return { ...result, degraded: true };
    });
  }
}

let cached: AiProvider | undefined;

export function getAiProvider(): AiProvider {
  if (cached) return cached;

  if (capabilities.aiProvider === 'gemini') {
    cached = new FallbackProvider(new GeminiProvider(), new MockProvider());
    log.info('AI provider ready', { primary: 'gemini', model: capabilities.aiModel, fallback: 'mock' });
  } else {
    cached = new MockProvider();
    log.info('AI provider ready', {
      primary: 'mock',
      reason: 'GEMINI_API_KEY is not set — using the deterministic provider',
    });
  }

  return cached;
}

/** Test seam: allows the provider to be swapped without touching services. */
export function setAiProvider(provider: AiProvider): void {
  cached = provider;
}
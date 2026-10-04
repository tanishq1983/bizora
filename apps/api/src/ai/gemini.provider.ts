import { GoogleGenAI } from '@google/genai';
import {
  answerEvaluationAiSchema,
  builderAiOutputSchema,
  reportNarrativeAiSchema,
  type AnswerEvaluationAi,
  type BuilderAiOutput,
  type ReportNarrative,
} from '@bizora/shared';
import type { z } from 'zod';
import { env } from '../config/env.js';
import { createLogger } from '../core/logger.js';
import { classifyAiFailure, parseLooseJson, withRetry, withTimeout } from '../core/resilience.js';
import { toGeminiSchema } from './gemini-schema.js';
import { builderPrompt, investorPrompt, reportPrompt } from './prompts/index.js';
import type { AgentResult, AiProvider, AnswerAgentInput, BuilderAgentInput, ReportAgentInput } from './provider.js';

const log = createLogger('ai:gemini');

/**
 * Gemini adapter.
 *
 * Three things this class is responsible for beyond "call the API":
 *
 *  1. Two transports. The Interactions API is preferred; the older
 *     generateContent path is kept as a fallback so the app survives an SDK
 *     surface change.
 *  2. A repair pass. If the reply does not satisfy the schema, the validation
 *     error is fed back to the model once. Most failures are a single missing
 *     or mistyped field, which one repair pass fixes.
 *  3. No sampling parameters. Gemini 3.6+ ignores temperature/topP/topK and
 *     rejects penalty parameters outright, so none are sent.
 */
export class GeminiProvider implements AiProvider {
  readonly name = 'gemini' as const;

  private readonly client: GoogleGenAI;
  private readonly supportsInteractions: boolean;

  constructor() {
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GeminiProvider requires GEMINI_API_KEY.');
    }

    this.client = new GoogleGenAI({ apiKey });
    const candidate = this.client as unknown as { interactions?: { create?: unknown } };
    this.supportsInteractions = typeof candidate.interactions?.create === 'function';
  }

  async buildAnalysis(input: BuilderAgentInput): Promise<AgentResult<BuilderAiOutput>> {
    return this.run(builderPrompt(input), builderAiOutputSchema, 'builder-agent', 'buildAnalysis');
  }

  async evaluateAnswer(input: AnswerAgentInput): Promise<AgentResult<AnswerEvaluationAi>> {
    return this.run(investorPrompt(input), answerEvaluationAiSchema, 'investor-agent', 'evaluateAnswer');
  }

  async buildReport(input: ReportAgentInput): Promise<AgentResult<ReportNarrative>> {
    return this.run(reportPrompt(input), reportNarrativeAiSchema, 'report-service', 'buildReport');
  }

  /**
   * One structured generation with timeout, transient retry, and a single
   * schema-repair attempt.
   */
  private async run<T>(
    prompt: string,
    schema: z.ZodType<T>,
    scope: string,
    label: string,
  ): Promise<AgentResult<T>> {
    const started = Date.now();
    const wireSchema = toGeminiSchema(schema);

    const attempt = async (requestPrompt: string): Promise<unknown> => {
      const raw = await withRetry(
        () => this.generate(requestPrompt, wireSchema),
        {
          attempts: 2,
          baseDelayMs: 500,
          onRetry: (n, error) => log.warn('transient failure, retrying', { attempt: n, reason: (error as Error).message }),
        },
      );
      return parseLooseJson(raw);
    };

    let payload: unknown;
    try {
      payload = await attempt(prompt);
    } catch (error) {
      throw classifyAiFailure(error);
    }

    const first = schema.safeParse(payload);
    if (first.success) {
      log.info('structured output accepted', { scope, label, ms: Date.now() - started });
      return { data: first.data, degraded: false, provider: this.name };
    }

    // One repair pass. This is where almost all schema failures are recovered.
    const issues = first.error.issues
      .slice(0, 12)
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');

    log.warn('schema mismatch, attempting repair', { scope, label, issues });

    try {
      payload = await attempt(
        `${prompt}\n\n---\nIMPORTANT: your previous response did not satisfy the required structure.\nProblems:\n${issues}\n\nReturn the corrected JSON object only. Every field listed in the schema must be present, correctly typed, and non-empty.`,
      );
    } catch (error) {
      throw classifyAiFailure(error);
    }

    const repaired = schema.safeParse(payload);
    if (repaired.success) {
      log.info('schema repair succeeded', { scope, label, ms: Date.now() - started });
      return { data: repaired.data, degraded: true, provider: this.name };
    }

    log.error('schema repair failed', { scope, label });
    throw classifyAiFailure(new SyntaxError('Response did not match the required structure'));
  }

  /** Returns the raw text of the model's JSON reply. */
  private async generate(prompt: string, wireSchema: Record<string, unknown>): Promise<string> {
    if (this.supportsInteractions) {
      return withTimeout(
        this.createInteraction(prompt, wireSchema),
        env.AI_TIMEOUT_MS,
        'gemini.interactions',
      );
    }
    return withTimeout(this.generateContent(prompt, wireSchema), env.AI_TIMEOUT_MS, 'gemini.generateContent');
  }

  private async createInteraction(prompt: string, wireSchema: Record<string, unknown>): Promise<string> {
    const client = this.client as unknown as {
      interactions: {
        create(params: {
          model: string;
          input: string;
          response_format: { type: string; mime_type: string; schema: Record<string, unknown> };
        }): Promise<{ output_text?: string; output?: unknown }>;
      };
    };

    const interaction = await client.interactions.create({
      model: env.GEMINI_MODEL,
      input: prompt,
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: wireSchema,
      },
    });

    const text = interaction.output_text ?? extractText(interaction.output);
    if (!text) throw new Error('Gemini returned an empty response.');
    return text;
  }

  private async generateContent(prompt: string, wireSchema: Record<string, unknown>): Promise<string> {
    const response = await this.client.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: wireSchema,
      },
    });

    const text = response.text ?? '';
    if (!text) throw new Error('Gemini returned an empty response.');
    return text;
  }
}

/** Last-resort text extraction across the response shapes the SDK has used. */
function extractText(output: unknown): string | undefined {
  if (typeof output === 'string') return output;
  if (!output || typeof output !== 'object') return undefined;

  const record = output as Record<string, unknown>;
  if (typeof record.text === 'string') return record.text;

  const steps = record.steps;
  if (Array.isArray(steps)) {
    const collected: string[] = [];
    for (const step of steps) {
      const text = extractText(step);
      if (text) collected.push(text);
    }
    if (collected.length) return collected.join('');
  }

  const content = record.content;
  if (Array.isArray(content)) {
    const collected: string[] = [];
    for (const part of content) {
      const text = extractText(part);
      if (text) collected.push(text);
    }
    if (collected.length) return collected.join('');
  }

  return undefined;
}
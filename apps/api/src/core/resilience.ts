import { AppError } from './errors.js';

/**
 * Resilience primitives shared by every outbound call.
 *
 * The AI is the only genuinely slow, genuinely unreliable dependency in the
 * system, so all of the retry/timeout policy is concentrated here rather than
 * scattered through the services.
 */

export class TimeoutError extends Error {
  constructor(
    public readonly ms: number,
    /** The operation that timed out, so the log line says which call stalled. */
    public readonly label: string,
  ) {
    super(`Operation timed out after ${ms}ms: ${label}`);
    this.name = 'TimeoutError';
  }
}

/**
 * Rejects with a TimeoutError if the promise has not settled in time. The
 * underlying work is not cancelled — it is simply abandoned, and its result is
 * discarded — because Gemini offers no cheap abort handle here.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutError(ms, label));
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        // A non-Error rejection would be swallowed by any `error.message` log
        // downstream, so it is normalised into a real Error here.
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function isTransient(error: unknown): boolean {
  if (error instanceof TimeoutError) return true;
  if (!(error instanceof Error)) return false;

  const anyError = error as Error & { status?: number; code?: number; name?: string };
  const status = anyError.status;
  if (typeof status === 'number') {
    // 429 rate limit, 408 request timeout, and all 5xx are worth one more go.
    if (status === 429 || status === 408) return true;
    if (status >= 500) return true;
  }
  if (typeof anyError.code === 'number' && anyError.code >= 500) return true;

  const message = anyError.message.toLowerCase();
  return (
    message.includes('overloaded') ||
    message.includes('rate limit') ||
    message.includes('unavailable') ||
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('socket hang up') ||
    message.includes('econnreset') ||
    message.includes('fetch failed')
  );
}

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  onRetry?: (attempt: number, error: unknown) => void;
}

/**
 * Retries only transient failures. A 400 or a schema violation is a real
 * answer from the provider, and retrying it just burns quota.
 */
export async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const attempts = options.attempts ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 400;
  const maxDelayMs = options.maxDelayMs ?? 2500;

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !isTransient(error)) throw error;
      options.onRetry?.(attempt, error);
      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      await sleep(delay);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Operation failed');
}

/**
 * Converts a transport failure into the AppError the user should see. Timeouts
 * and rate limits get their own messages because the remedy differs.
 */
export function classifyAiFailure(error: unknown): AppError {
  if (error instanceof TimeoutError) {
    return new AppError('AI_TIMEOUT', 'The AI took longer than expected to respond. Please try again.');
  }

  const anyError = error as Error & { status?: number };
  if (typeof anyError?.status === 'number') {
    if (anyError.status === 429) {
      return new AppError('RATE_LIMITED', 'The AI service is rate limiting us right now. Please wait a moment and try again.');
    }
    if (anyError.status === 401 || anyError.status === 403) {
      return new AppError('AI_UNAVAILABLE', 'The AI service rejected our credentials. Please check the server configuration.');
    }
    if (anyError.status >= 500) {
      return new AppError('AI_UNAVAILABLE', 'The AI service is unavailable right now. Please try again in a moment.');
    }
  }

  if (error instanceof SyntaxError) {
    return new AppError('AI_INVALID_OUTPUT', 'The AI returned a response we could not read. Please try again.');
  }

  return new AppError('AI_UNAVAILABLE', 'We could not reach the AI service. Please try again in a moment.');
}

/**
 * Parses JSON that may be wrapped in a markdown fence. Used only as a safety
 * net — the primary defence is the structured-output schema.
 */
export function parseLooseJson(raw: string): unknown {
  const trimmed = raw.trim();

  const direct = tryParse(trimmed);
  if (direct !== undefined) return direct;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    const inner = tryParse(fenced[1].trim());
    if (inner !== undefined) return inner;
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const sliced = tryParse(trimmed.slice(firstBrace, lastBrace + 1));
    if (sliced !== undefined) return sliced;
  }

  throw new SyntaxError('Response was not valid JSON');
}

function tryParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}
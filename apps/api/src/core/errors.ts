import type { ApiErrorCode } from '@bizora/shared';

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  IDEA_TOO_SHORT: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  AI_TIMEOUT: 504,
  AI_INVALID_OUTPUT: 502,
  AI_UNAVAILABLE: 503,
  UPSTREAM_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
};

/**
 * The only error type the application throws deliberately. Everything else is
 * treated as an unexpected fault and reported generically, so internals never
 * leak to the browser.
 */
export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details: unknown;

  constructor(code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = STATUS_BY_CODE[code] ?? 500;
    this.details = details;
  }
}

const build = (code: ApiErrorCode, message: string) => (details?: unknown) => new AppError(code, message, details);

/**
 * Every message here is written to be shown to a founder as-is. The API never
 * returns a raw stack, a provider error string, or an HTTP status without a
 * sentence attached explaining what to do next.
 */
export const errors = {
  validation: build('VALIDATION_ERROR', 'Some of the details we received did not look right. Please check and try again.'),

  ideaEmpty: build('VALIDATION_ERROR', 'Enter a startup idea before continuing.'),
  ideaTooShort: build('IDEA_TOO_SHORT', 'Give us a little more detail so the Builder Agent has something to work with.'),

  answerEmpty: build('VALIDATION_ERROR', 'Write an answer before submitting it.'),
  answerTooShort: build('VALIDATION_ERROR', 'That answer is too short to evaluate credibly. Add a specific example or number.'),

  unauthorized: build('UNAUTHORIZED', 'Your session has expired. Please sign in again to continue.'),
  invalidCredentials: build('UNAUTHORIZED', 'That email and password combination did not work.'),
  emailInUse: build('CONFLICT', 'An account already exists for that email. Try signing in instead.'),

  startupNotFound: build('NOT_FOUND', 'We could not find that startup. It may have been from an earlier session.'),
  analysisNotFound: build('NOT_FOUND', 'No analysis exists for this startup yet. Run the Builder Agent first.'),
  sessionNotFound: build('NOT_FOUND', 'We could not find that investor session.'),
  reportNotFound: build('NOT_FOUND', 'The final report has not been generated yet.'),

  analysisMissing: build('CONFLICT', 'Run the Builder Agent on this idea before starting the investor interview.'),
  questionOutOfOrder: build('CONFLICT', 'Answer the questions in order — the next one unlocks once this is done.'),
  duplicateAnswer: build('CONFLICT', 'That question already has an answer saved.'),
  incompleteSession: build('CONFLICT', 'Answer all three investor questions before generating the report.'),

  aiTimeout: build('AI_TIMEOUT', 'The AI took longer than expected to respond. Please try again.'),
  aiInvalidOutput: build('AI_INVALID_OUTPUT', 'The AI returned something we could not read. Please try again.'),
  aiUnavailable: build('AI_UNAVAILABLE', 'The AI service is unavailable right now. Please try again in a moment.'),
  aiNotConfigured: build('AI_UNAVAILABLE', 'No AI provider is configured on the server.'),

  upstreamUnavailable: build('UPSTREAM_UNAVAILABLE', 'We could not reach a service we depend on. Please try again.'),
  networkFailure: build('UPSTREAM_UNAVAILABLE', 'We could not reach the Bizora API. Check your connection and try again.'),

  internal: build('INTERNAL_ERROR', 'Something went wrong on our side. Please try again.'),
} as const;

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

export function statusForCode(code: ApiErrorCode): number {
  return STATUS_BY_CODE[code] ?? 500;
}

/** Normalises anything thrown into an AppError so the handler has one shape. */
export function toAppError(value: unknown): AppError {
  if (isAppError(value)) return value;

  if (value instanceof Error) {
    const anyError = value as Error & { code?: string; status?: number };
    // Surface provider faults with a useful code rather than a generic 500.
    if (anyError.code === 'ECONNREFUSED' || anyError.code === 'ENOTFOUND' || anyError.code === 'ETIMEDOUT') {
      return new AppError('UPSTREAM_UNAVAILABLE', errors.upstreamUnavailable().message);
    }
    if (typeof anyError.status === 'number' && anyError.status >= 400 && anyError.status < 500) {
      return new AppError('VALIDATION_ERROR', anyError.message);
    }
  }

  return new AppError('INTERNAL_ERROR', errors.internal().message);
}
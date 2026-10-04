/**
 * Every Bizora endpoint answers with this envelope. The frontend can therefore
 * render errors as friendly UI without ever inspecting an HTTP status code or
 * parsing a stack trace.
 */
export const API_ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'IDEA_TOO_SHORT',
  'AI_TIMEOUT',
  'AI_INVALID_OUTPUT',
  'AI_UNAVAILABLE',
  'UPSTREAM_UNAVAILABLE',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiFailure {
  ok: false;
  error: ApiError;
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export function ok<T>(data: T): ApiSuccess<T> {
  return { ok: true, data };
}

export function fail(code: ApiErrorCode, message: string, details?: unknown): ApiFailure {
  return { ok: false, error: details === undefined ? { code, message } : { code, message, details } };
}

/* ── Identity ────────────────────────────────────────────────────────────── */

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  mode: 'supabase' | 'guest';
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
}

export interface GuestSessionResponse {
  user: AuthUser;
  accessToken: string;
}

export interface CredentialsResponse {
  user: AuthUser;
  accessToken: string;
}

/* ── Idea → analysis ─────────────────────────────────────────────────────── */

export interface AnalyzeIdeaResponse {
  startupId: string;
  analysisId: string;
  startupName: string;
  analysis: import('../contracts/builder.js').BuilderAnalysis;
  provider: 'gemini' | 'mock';
  degraded: boolean;
}

/* ── Analysis retrieval ──────────────────────────────────────────────────── */

export interface AnalysisResponse {
  startupId: string;
  analysisId: string;
  idea: string;
  analysis: import('../contracts/builder.js').BuilderAnalysis;
  createdAt: string;
}

export interface StartupSummary {
  id: string;
  idea: string;
  startupName: string | null;
  overallScore: number | null;
  hasReport: boolean;
  sessionStatus: import('../contracts/investor.js').SessionStatus | null;
  createdAt: string;
}

export interface StartupListResponse {
  startups: StartupSummary[];
}

/**
 * Everything reachable from one startup, in a single round trip. The dashboard
 * would otherwise have to coordinate three requests and render a half-populated
 * page in between.
 */
export interface StartupBundle {
  startup: {
    id: string;
    idea: string;
    startupName: string | null;
    createdAt: string;
  };
  analysis: {
    analysisId: string;
    analysis: import('../contracts/builder.js').BuilderAnalysis;
    createdAt: string;
  } | null;
  session: { id: string; status: import('../contracts/investor.js').SessionStatus } | null;
  report: { id: string; investorReadinessScore: number } | null;
}

export interface StartupBundleResponse {
  startup: StartupBundle['startup'];
  analysis: StartupBundle['analysis'];
  session: StartupBundle['session'];
  report: StartupBundle['report'];
}

/* ── Investor session ────────────────────────────────────────────────────── */

export interface CreateSessionResponse {
  sessionId: string;
  startupId: string;
  status: import('../contracts/investor.js').SessionStatus;
  questions: import('../contracts/investor.js').InvestorQuestion[];
  currentIndex: number;
  responses: import('../contracts/investor.js').FounderResponse[];
}

export type AnswerResponse = CreateSessionResponse;

export interface SubmitAnswerRequest {
  sessionId: string;
  questionKey: import('../investor-questions.js').InvestorQuestionKey;
  answer: string;
}

export interface SubmitAnswerResponse {
  sessionId: string;
  questionKey: import('../investor-questions.js').InvestorQuestionKey;
  evaluation: import('../contracts/investor.js').AnswerEvaluation;
  currentIndex: number;
  status: import('../contracts/investor.js').SessionStatus;
  /** True once all three answers are in — the client then enables the report CTA. */
  readyForReport: boolean;
  /** The stored answer, so the transcript can be rendered without a refetch. */
  response: import('../contracts/investor.js').FounderResponse;
}

/* ── Report ──────────────────────────────────────────────────────────────── */

export interface GenerateReportResponse {
  startupId: string;
  reportId: string;
  report: import('../contracts/report.js').InvestorReport;
  provider: 'gemini' | 'mock';
  degraded: boolean;
}

export type ReportResponse = GenerateReportResponse;

/* ── Health / capabilities ───────────────────────────────────────────────── */

export interface HealthResponse {
  status: 'ok';
  uptimeSeconds: number;
  ai: { provider: 'gemini' | 'mock'; model: string; live: boolean };
  data: { store: 'supabase' | 'memory'; live: boolean };
  auth: { mode: 'supabase' | 'guest' };
  version: string;
}
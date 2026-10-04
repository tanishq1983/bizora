import type {
  AnswerEvaluation,
  BuilderAnalysis,
  FounderResponse,
  InvestorQuestionKey,
  InvestorReport,
  NextStep,
  SessionStatus,
} from '@bizora/shared';
import type { AuthUser } from '@bizora/shared';

/* ── Row shapes ──────────────────────────────────────────────────────────── */

export interface UserRow {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

export interface StartupRow {
  id: string;
  userId: string;
  idea: string;
  startupName: string | null;
  createdAt: string;
}

export interface AnalysisRow {
  id: string;
  startupId: string;
  analysis: BuilderAnalysis;
  createdAt: string;
}

export interface SessionRow {
  id: string;
  startupId: string;
  userId: string;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ResponseRow {
  id: string;
  sessionId: string;
  questionKey: InvestorQuestionKey;
  question: string;
  answer: string;
  clarityScore: number;
  marketUnderstandingScore: number;
  financialReasoningScore: number;
  feedback: AnswerEvaluation;
  createdAt: string;
}

export interface ReportRow {
  id: string;
  startupId: string;
  investorReadinessScore: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  overallFeedback: string;
  nextSteps: NextStep[];
  /** The full report, including next steps, band and score breakdown. */
  payload: InvestorReport;
  createdAt: string;
}

/* ── Queries ─────────────────────────────────────────────────────────────── */

export interface StartupSummary {
  id: string;
  idea: string;
  startupName: string | null;
  overallScore: number | null;
  hasReport: boolean;
  sessionStatus: SessionStatus | null;
  createdAt: string;
}

/**
 * Persistence boundary. The API never talks to Postgres or Supabase directly —
 * it talks to this. That is what allows the same services to run against a real
 * database in production and an in-process store during a demo.
 */
export interface DataStore {
  readonly kind: 'supabase' | 'memory';

  init(): Promise<void>;
  dispose(): Promise<void>;
  healthy(): Promise<boolean>;

  /* users */
  upsertUser(user: AuthUser): Promise<UserRow>;
  findUserById(id: string): Promise<UserRow | null>;
  findUserByEmail(email: string): Promise<UserRow | null>;

  /* startups */
  createStartup(input: { userId: string; idea: string; startupName: string | null }): Promise<StartupRow>;
  findStartup(id: string): Promise<StartupRow | null>;
  findStartupForUser(id: string, userId: string): Promise<StartupRow | null>;
  updateStartupName(id: string, startupName: string): Promise<void>;
  listStartupsForUser(userId: string): Promise<StartupSummary[]>;

  /* analyses */
  createAnalysis(input: { startupId: string; analysis: BuilderAnalysis }): Promise<AnalysisRow>;
  findLatestAnalysis(startupId: string): Promise<AnalysisRow | null>;
  findAnalysis(id: string): Promise<AnalysisRow | null>;

  /* investor sessions */
  createSession(input: { startupId: string; userId: string }): Promise<SessionRow>;
  findSession(id: string): Promise<SessionRow | null>;
  findLatestSession(startupId: string): Promise<SessionRow | null>;
  updateSessionStatus(id: string, status: SessionStatus): Promise<SessionRow | null>;

  /* responses */
  createResponse(input: Omit<ResponseRow, 'id' | 'createdAt'>): Promise<ResponseRow>;
  findResponseByQuestion(sessionId: string, questionKey: InvestorQuestionKey): Promise<ResponseRow | null>;
  listResponses(sessionId: string): Promise<ResponseRow[]>;

  /* reports */
  createReport(row: Omit<ReportRow, 'id' | 'createdAt'>): Promise<ReportRow>;
  findLatestReport(startupId: string): Promise<ReportRow | null>;
}

export type { FounderResponse };
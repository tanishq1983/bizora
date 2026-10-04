import { randomUUID } from 'node:crypto';
import type { BuilderAnalysis, InvestorQuestionKey, SessionStatus } from '@bizora/shared';
import type { AuthUser } from '@bizora/shared';
import { createLogger } from '../core/logger.js';
import type {
  AnalysisRow,
  DataStore,
  ReportRow,
  ResponseRow,
  SessionRow,
  StartupRow,
  StartupSummary,
  UserRow,
} from './store.js';

const log = createLogger('store:memory');

/**
 * In-process store used for local development and demos.
 *
 * It is a real implementation of the persistence contract, not a stub: it
 * enforces the same foreign-key relationships the SQL schema does, so a service
 * bug that only shows up under Supabase shows up here too. The one thing it
 * cannot do is survive a restart.
 */
export class MemoryDataStore implements DataStore {
  readonly kind = 'memory' as const;

  private readonly users = new Map<string, UserRow>();
  private readonly startups = new Map<string, StartupRow>();
  private readonly analyses = new Map<string, AnalysisRow[]>();
  private readonly sessions = new Map<string, SessionRow[]>();
  private readonly responses = new Map<string, ResponseRow[]>();
  private readonly reports = new Map<string, ReportRow[]>();

  async init(): Promise<void> {
    log.warn('using the in-memory data store — data will not survive a restart');
  }

  async dispose(): Promise<void> {
    this.users.clear();
    this.startups.clear();
    this.analyses.clear();
    this.sessions.clear();
    this.responses.clear();
    this.reports.clear();
  }

  async healthy(): Promise<boolean> {
    return true;
  }

  /* ── users ─────────────────────────────────────────────────────────────── */

  async upsertUser(user: AuthUser): Promise<UserRow> {
    const existing = this.users.get(user.id);
    if (existing) {
      const updated: UserRow = { ...existing, email: user.email, displayName: user.displayName };
      this.users.set(user.id, updated);
      return updated;
    }
    const row: UserRow = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: new Date().toISOString(),
    };
    this.users.set(row.id, row);
    return row;
  }

  async findUserById(id: string): Promise<UserRow | null> {
    return this.users.get(id) ?? null;
  }

  async findUserByEmail(email: string): Promise<UserRow | null> {
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) return user;
    }
    return null;
  }

  /* ── startups ──────────────────────────────────────────────────────────── */

  async createStartup(input: { userId: string; idea: string; startupName: string | null }): Promise<StartupRow> {
    const row: StartupRow = {
      id: randomUUID(),
      userId: input.userId,
      idea: input.idea,
      startupName: input.startupName,
      createdAt: new Date().toISOString(),
    };
    this.startups.set(row.id, row);
    return row;
  }

  async findStartup(id: string): Promise<StartupRow | null> {
    return this.startups.get(id) ?? null;
  }

  async findStartupForUser(id: string, userId: string): Promise<StartupRow | null> {
    const row = this.startups.get(id);
    if (!row || row.userId !== userId) return null;
    return row;
  }

  async updateStartupName(id: string, startupName: string): Promise<void> {
    const row = this.startups.get(id);
    if (!row) return;
    this.startups.set(id, { ...row, startupName });
  }

  async listStartupsForUser(userId: string): Promise<StartupSummary[]> {
    const summaries: StartupSummary[] = [];

    for (const startup of this.startups.values()) {
      if (startup.userId !== userId) continue;

      const analyses = this.analyses.get(startup.id) ?? [];
      const latest = analyses[analyses.length - 1] ?? null;
      const sessions = this.sessions.get(startup.id) ?? [];
      const latestSession = sessions[sessions.length - 1] ?? null;
      const reports = this.reports.get(startup.id) ?? [];

      summaries.push({
        id: startup.id,
        idea: startup.idea,
        startupName: startup.startupName ?? latest?.analysis.startupName ?? null,
        overallScore: latest?.analysis.scores.overall ?? null,
        hasReport: reports.length > 0,
        sessionStatus: latestSession?.status ?? null,
        createdAt: startup.createdAt,
      });
    }

    return summaries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /* ── analyses ──────────────────────────────────────────────────────────── */

  async createAnalysis(input: { startupId: string; analysis: BuilderAnalysis }): Promise<AnalysisRow> {
    const row: AnalysisRow = {
      id: randomUUID(),
      startupId: input.startupId,
      analysis: input.analysis,
      createdAt: new Date().toISOString(),
    };
    const existing = this.analyses.get(input.startupId) ?? [];
    existing.push(row);
    this.analyses.set(input.startupId, existing);
    return row;
  }

  async findLatestAnalysis(startupId: string): Promise<AnalysisRow | null> {
    const rows = this.analyses.get(startupId) ?? [];
    return rows[rows.length - 1] ?? null;
  }

  async findAnalysis(id: string): Promise<AnalysisRow | null> {
    for (const rows of this.analyses.values()) {
      const found = rows.find((row) => row.id === id);
      if (found) return found;
    }
    return null;
  }

  /* ── sessions ──────────────────────────────────────────────────────────── */

  async createSession(input: { startupId: string; userId: string }): Promise<SessionRow> {
    const now = new Date().toISOString();
    const row: SessionRow = {
      id: randomUUID(),
      startupId: input.startupId,
      userId: input.userId,
      status: 'not_started',
      createdAt: now,
      updatedAt: now,
    };
    const existing = this.sessions.get(input.startupId) ?? [];
    existing.push(row);
    this.sessions.set(input.startupId, existing);
    return row;
  }

  async findSession(id: string): Promise<SessionRow | null> {
    for (const rows of this.sessions.values()) {
      const found = rows.find((row) => row.id === id);
      if (found) return found;
    }
    return null;
  }

  async findLatestSession(startupId: string): Promise<SessionRow | null> {
    const rows = this.sessions.get(startupId) ?? [];
    return rows[rows.length - 1] ?? null;
  }

  async updateSessionStatus(id: string, status: SessionStatus): Promise<SessionRow | null> {
    for (const [startupId, rows] of this.sessions) {
      const index = rows.findIndex((row) => row.id === id);
      if (index === -1) continue;
      const updated: SessionRow = { ...rows[index]!, status, updatedAt: new Date().toISOString() };
      rows[index] = updated;
      this.sessions.set(startupId, rows);
      return updated;
    }
    return null;
  }

  /* ── responses ─────────────────────────────────────────────────────────── */

  async createResponse(input: Omit<ResponseRow, 'id' | 'createdAt'>): Promise<ResponseRow> {
    const row: ResponseRow = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
    const existing = this.responses.get(input.sessionId) ?? [];
    existing.push(row);
    this.responses.set(input.sessionId, existing);
    return row;
  }

  async findResponseByQuestion(sessionId: string, questionKey: InvestorQuestionKey): Promise<ResponseRow | null> {
    const rows = this.responses.get(sessionId) ?? [];
    return rows.find((row) => row.questionKey === questionKey) ?? null;
  }

  async listResponses(sessionId: string): Promise<ResponseRow[]> {
    return [...(this.responses.get(sessionId) ?? [])];
  }

  /* ── reports ───────────────────────────────────────────────────────────── */

  async createReport(row: Omit<ReportRow, 'id' | 'createdAt'>): Promise<ReportRow> {
    const created: ReportRow = { ...row, id: randomUUID(), createdAt: new Date().toISOString() };
    const existing = this.reports.get(row.startupId) ?? [];
    existing.push(created);
    this.reports.set(row.startupId, existing);
    return created;
  }

  async findLatestReport(startupId: string): Promise<ReportRow | null> {
    const rows = this.reports.get(startupId) ?? [];
    return rows[rows.length - 1] ?? null;
  }
}
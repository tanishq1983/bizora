import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AuthUser, BuilderAnalysis, InvestorQuestionKey, SessionStatus } from '@bizora/shared';
import { env } from '../config/env.js';
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

const log = createLogger('store:supabase');

type Row = Record<string, unknown>;

// PostgREST returns jsonb columns as parsed values, so a "text" column can
// arrive as a number or boolean. Objects are deliberately not stringified:
// that would silently write "[object Object]" into the database.
const str = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return String(value);
  return '';
};
const strOrNull = (value: unknown): string | null => (typeof value === 'string' && value.length ? value : null);
const num = (value: unknown): number => (typeof value === 'number' ? value : Number(value ?? 0));

function json<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value as T;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/** Reassembles the analysis blob stored across the six structured columns. */
function toAnalysis(row: Row): AnalysisRow {
  const payload = json<Partial<BuilderAnalysis> | null>(row.meta, null);
  const analysis: BuilderAnalysis = {
    startupName: str(row.startup_name) || str(payload?.startupName) || 'Untitled startup',
    summary: str(row.summary) || str(payload?.summary),
    businessProfile: json(row.business_profile, payload?.businessProfile) as BuilderAnalysis['businessProfile'],
    marketOpportunity: json(row.market_opportunity, payload?.marketOpportunity) as BuilderAnalysis['marketOpportunity'],
    competitors: json(row.competitor_snapshot, payload?.competitors) as BuilderAnalysis['competitors'],
    scores: json(row.scores, payload?.scores) as BuilderAnalysis['scores'],
    mvpRoadmap: json(row.mvp_roadmap, payload?.mvpRoadmap) as BuilderAnalysis['mvpRoadmap'],
    costRevenue: json(row.cost_revenue, payload?.costRevenue) as BuilderAnalysis['costRevenue'],
    estimateNotice: str(payload?.estimateNotice),
    degraded: payload?.degraded === true,
  };

  return {
    id: str(row.id),
    startupId: str(row.startup_id),
    analysis,
    createdAt: str(row.created_at),
  };
}

export class SupabaseDataStore implements DataStore {
  readonly kind = 'supabase' as const;

  private readonly client: SupabaseClient;

  constructor(url = env.SUPABASE_URL, key = env.SUPABASE_SERVICE_ROLE_KEY) {
    if (!url || !key) {
      throw new Error('SupabaseDataStore requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    }
    this.client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async init(): Promise<void> {
    const { error } = await this.client.from('startups').select('id').limit(1);
    if (error) {
      throw new Error(`Supabase schema check failed: ${error.message}. Run db/schema.sql first.`);
    }
    log.info('supabase data store ready');
  }

  async dispose(): Promise<void> {
    /* Supabase manages its own connections. */
  }

  async healthy(): Promise<boolean> {
    const { error } = await this.client.from('startups').select('id').limit(1);
    return !error;
  }

  /* ── users ─────────────────────────────────────────────────────────────── */

  async upsertUser(user: AuthUser): Promise<UserRow> {
    const { data, error } = await this.client
      .from('users')
      .upsert(
        { id: user.id, email: user.email, display_name: user.displayName, updated_at: new Date().toISOString() },
        { onConflict: 'id' },
      )
      .select()
      .single();
    if (error) throw error;

    const row = data as Row;
    return {
      id: str(row.id),
      email: str(row.email),
      displayName: str(row.display_name),
      createdAt: str(row.created_at),
    };
  }

  async findUserById(id: string): Promise<UserRow | null> {
    const { data, error } = await this.client.from('users').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = data as Row;
    return {
      id: str(row.id),
      email: str(row.email),
      displayName: str(row.display_name),
      createdAt: str(row.created_at),
    };
  }

  async findUserByEmail(email: string): Promise<UserRow | null> {
    const { data, error } = await this.client.from('users').select('*').ilike('email', email).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = data as Row;
    return {
      id: str(row.id),
      email: str(row.email),
      displayName: str(row.display_name),
      createdAt: str(row.created_at),
    };
  }

  /* ── startups ──────────────────────────────────────────────────────────── */

  async createStartup(input: { userId: string; idea: string; startupName: string | null }): Promise<StartupRow> {
    const { data, error } = await this.client
      .from('startups')
      .insert({ user_id: input.userId, idea: input.idea, startup_name: input.startupName })
      .select()
      .single();
    if (error) throw error;
    const row = data as Row;
    return {
      id: str(row.id),
      userId: str(row.user_id),
      idea: str(row.idea),
      startupName: strOrNull(row.startup_name),
      createdAt: str(row.created_at),
    };
  }

  async findStartup(id: string): Promise<StartupRow | null> {
    const { data, error } = await this.client.from('startups').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = data as Row;
    return {
      id: str(row.id),
      userId: str(row.user_id),
      idea: str(row.idea),
      startupName: strOrNull(row.startup_name),
      createdAt: str(row.created_at),
    };
  }

  async findStartupForUser(id: string, userId: string): Promise<StartupRow | null> {
    const { data, error } = await this.client.from('startups').select('*').eq('id', id).eq('user_id', userId).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = data as Row;
    return {
      id: str(row.id),
      userId: str(row.user_id),
      idea: str(row.idea),
      startupName: strOrNull(row.startup_name),
      createdAt: str(row.created_at),
    };
  }

  async updateStartupName(id: string, startupName: string): Promise<void> {
    const { error } = await this.client.from('startups').update({ startup_name: startupName }).eq('id', id);
    if (error) throw error;
  }

  async listStartupsForUser(userId: string): Promise<StartupSummary[]> {
    const { data, error } = await this.client
      .from('startups')
      .select('id, idea, startup_name, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const rows = (data ?? []) as Row[];

    return Promise.all(
      rows.map(async (row) => {
        const startupId = str(row.id);
        const [analysis, session, report] = await Promise.all([
          this.findLatestAnalysis(startupId),
          this.findLatestSession(startupId),
          this.findLatestReport(startupId),
        ]);

        return {
          id: startupId,
          idea: str(row.idea),
          startupName: strOrNull(row.startup_name) ?? analysis?.analysis.startupName ?? null,
          overallScore: analysis?.analysis.scores.overall ?? null,
          hasReport: report !== null,
          sessionStatus: session?.status ?? null,
          createdAt: str(row.created_at),
        } satisfies StartupSummary;
      }),
    );
  }

  /* ── analyses ──────────────────────────────────────────────────────────── */

  async createAnalysis(input: { startupId: string; analysis: BuilderAnalysis }): Promise<AnalysisRow> {
    const a = input.analysis;
    const { data, error } = await this.client
      .from('analyses')
      .insert({
        startup_id: input.startupId,
        startup_name: a.startupName,
        summary: a.summary,
        business_profile: a.businessProfile,
        market_opportunity: a.marketOpportunity,
        competitor_snapshot: a.competitors,
        scores: a.scores,
        mvp_roadmap: a.mvpRoadmap,
        cost_revenue: a.costRevenue,
        meta: { estimateNotice: a.estimateNotice, degraded: a.degraded },
      })
      .select()
      .single();
    if (error) throw error;

    return {
      id: str((data as Row).id),
      startupId: input.startupId,
      analysis: input.analysis,
      createdAt: str((data as Row).created_at),
    };
  }

  async findLatestAnalysis(startupId: string): Promise<AnalysisRow | null> {
    const { data, error } = await this.client
      .from('analyses')
      .select('*')
      .eq('startup_id', startupId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? toAnalysis(data as Row) : null;
  }

  async findAnalysis(id: string): Promise<AnalysisRow | null> {
    const { data, error } = await this.client.from('analyses').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toAnalysis(data as Row) : null;
  }

  /* ── sessions ──────────────────────────────────────────────────────────── */

  async createSession(input: { startupId: string; userId: string }): Promise<SessionRow> {
    const { data, error } = await this.client
      .from('investor_sessions')
      .insert({ startup_id: input.startupId, user_id: input.userId, status: 'not_started' })
      .select()
      .single();
    if (error) throw error;
    const row = data as Row;
    return {
      id: str(row.id),
      startupId: str(row.startup_id),
      userId: str(row.user_id),
      status: str(row.status) as SessionStatus,
      createdAt: str(row.created_at),
      updatedAt: str(row.updated_at),
    };
  }

  async findSession(id: string): Promise<SessionRow | null> {
    const { data, error } = await this.client.from('investor_sessions').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = data as Row;
    return {
      id: str(row.id),
      startupId: str(row.startup_id),
      userId: str(row.user_id),
      status: str(row.status) as SessionStatus,
      createdAt: str(row.created_at),
      updatedAt: str(row.updated_at),
    };
  }

  async findLatestSession(startupId: string): Promise<SessionRow | null> {
    const { data, error } = await this.client
      .from('investor_sessions')
      .select('*')
      .eq('startup_id', startupId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = data as Row;
    return {
      id: str(row.id),
      startupId: str(row.startup_id),
      userId: str(row.user_id),
      status: str(row.status) as SessionStatus,
      createdAt: str(row.created_at),
      updatedAt: str(row.updated_at),
    };
  }

  async updateSessionStatus(id: string, status: SessionStatus): Promise<SessionRow | null> {
    const { data, error } = await this.client
      .from('investor_sessions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    const row = data as Row;
    return {
      id: str(row.id),
      startupId: str(row.startup_id),
      userId: str(row.user_id),
      status: str(row.status) as SessionStatus,
      createdAt: str(row.created_at),
      updatedAt: str(row.updated_at),
    };
  }

  /* ── responses ─────────────────────────────────────────────────────────── */

  async createResponse(input: Omit<ResponseRow, 'id' | 'createdAt'>): Promise<ResponseRow> {
    const { data, error } = await this.client
      .from('responses')
      .insert({
        session_id: input.sessionId,
        question_key: input.questionKey,
        question: input.question,
        answer: input.answer,
        clarity_score: input.clarityScore,
        market_understanding_score: input.marketUnderstandingScore,
        financial_reasoning_score: input.financialReasoningScore,
        feedback: input.feedback,
      })
      .select()
      .single();
    if (error) throw error;
    return this.toResponse(data as Row);
  }

  async findResponseByQuestion(sessionId: string, questionKey: InvestorQuestionKey): Promise<ResponseRow | null> {
    const { data, error } = await this.client
      .from('responses')
      .select('*')
      .eq('session_id', sessionId)
      .eq('question_key', questionKey)
      .maybeSingle();
    if (error) throw error;
    return data ? this.toResponse(data as Row) : null;
  }

  async listResponses(sessionId: string): Promise<ResponseRow[]> {
    const { data, error } = await this.client
      .from('responses')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return ((data ?? []) as Row[]).map((row) => this.toResponse(row));
  }

  private toResponse(row: Row): ResponseRow {
    return {
      id: str(row.id),
      sessionId: str(row.session_id),
      questionKey: str(row.question_key) as InvestorQuestionKey,
      question: str(row.question),
      answer: str(row.answer),
      clarityScore: num(row.clarity_score),
      marketUnderstandingScore: num(row.market_understanding_score),
      financialReasoningScore: num(row.financial_reasoning_score),
      feedback: json(row.feedback, {} as ResponseRow['feedback']),
      createdAt: str(row.created_at),
    };
  }

  /* ── reports ───────────────────────────────────────────────────────────── */

  async createReport(row: Omit<ReportRow, 'id' | 'createdAt'>): Promise<ReportRow> {
    const { data, error } = await this.client
      .from('reports')
      .insert({
        startup_id: row.startupId,
        investor_readiness_score: row.investorReadinessScore,
        strengths: row.strengths,
        weaknesses: row.weaknesses,
        suggestions: row.suggestions,
        overall_feedback: row.overallFeedback,
        next_steps: row.nextSteps ?? [],
        payload: row.payload,
      })
      .select('id, created_at')
      .single();
    if (error) throw error;

    return {
      ...row,
      nextSteps: row.nextSteps ?? [],
      id: str((data as Row).id),
      createdAt: str((data as Row).created_at),
    };
  }

  async findLatestReport(startupId: string): Promise<ReportRow | null> {
    const { data, error } = await this.client
      .from('reports')
      .select('*')
      .eq('startup_id', startupId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const row = data as Row;
    const payload = json(row.payload, {} as ReportRow['payload']);
    return {
      id: str(row.id),
      startupId: str(row.startup_id),
      investorReadinessScore: num(row.investor_readiness_score),
      strengths: json(row.strengths, [] as string[]),
      weaknesses: json(row.weaknesses, [] as string[]),
      suggestions: json(row.suggestions, [] as string[]),
      overallFeedback: str(row.overall_feedback),
      nextSteps: payload.nextSteps ?? json(row.next_steps, []),
      payload,
      createdAt: str(row.created_at),
    };
  }
}
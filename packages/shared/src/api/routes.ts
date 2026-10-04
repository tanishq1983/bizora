export const API_PREFIX = '/api';

/**
 * Base paths for each resource. Endpoints are built from these so the mount
 * points in the server and the URLs in the client cannot drift apart.
 */
export const API_BASES = {
  auth: `${API_PREFIX}/auth`,
  idea: `${API_PREFIX}/idea`,
  analysis: `${API_PREFIX}/analysis`,
  startups: `${API_PREFIX}/startups`,
  investor: `${API_PREFIX}/investor`,
  session: `${API_PREFIX}/session`,
  report: `${API_PREFIX}/report`,
  health: `${API_PREFIX}/health`,
} as const;

export type ApiBaseKey = keyof typeof API_BASES;

export const API_ROUTES = {
  health: API_BASES.health,

  auth: {
    guest: `${API_BASES.auth}/guest`,
    signUp: `${API_BASES.auth}/signup`,
    signIn: `${API_BASES.auth}/signin`,
    me: `${API_BASES.auth}/me`,
  },

  idea: {
    analyze: `${API_BASES.idea}/analyze`,
    validate: `${API_BASES.idea}/validate`,
  },

  analysis: {
    byId: (id: string) => `${API_BASES.analysis}/${id}`,
  },

  startups: {
    list: API_BASES.startups,
    byId: (id: string) => `${API_BASES.startups}/${id}`,
    reanalyze: (id: string) => `${API_BASES.startups}/${id}/reanalyze`,
  },

  investor: {
    session: `${API_BASES.investor}/session`,
    answer: `${API_BASES.investor}/answer`,
    report: `${API_BASES.investor}/report`,
  },

  session: {
    byId: (id: string) => `${API_BASES.session}/${id}`,
  },

  report: {
    byId: (id: string) => `${API_BASES.report}/${id}`,
  },
} as const;

/** Client-side route paths, kept next to the API routes so they cannot drift. */
export const APP_ROUTES = {
  home: '/',
  validate: '/validate',
  login: '/login',
  workspace: '/workspace',
  dashboard: (startupId: string) => `/dashboard/${startupId}`,
  investor: (sessionId: string) => `/investor/${sessionId}`,
  report: (startupId: string) => `/report/${startupId}`,
} as const;

/** The five stages of the Bizora journey, rendered as a persistent progress rail. */
export const JOURNEY_STAGES = [
  { key: 'idea', label: 'Idea', description: 'Describe your startup' },
  { key: 'builder', label: 'Builder Agent', description: 'AI startup analysis' },
  { key: 'analysis', label: 'Analysis', description: 'Scores and roadmap' },
  { key: 'investor', label: 'Investor Agent', description: 'Three hard questions' },
  { key: 'report', label: 'Final Report', description: 'Investor readiness' },
] as const;

export type JourneyStageKey = (typeof JOURNEY_STAGES)[number]['key'];

export const JOURNEY_PIPELINE: readonly { key: JourneyStageKey; label: string }[] = [
  { key: 'idea', label: 'Idea' },
  { key: 'builder', label: 'Builder Agent' },
  { key: 'analysis', label: 'Analysis' },
  { key: 'investor', label: 'Investor Agent' },
  { key: 'report', label: 'Final Report' },
] as const;
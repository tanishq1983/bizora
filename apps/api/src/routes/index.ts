import { Router } from 'express';
import { API_BASES, API_ROUTES, type HealthResponse } from '@bizora/shared';
import { capabilities, env } from '../config/env.js';
import { createLogger } from '../core/logger.js';
import { asyncHandler, createAuthMiddleware, requireUser } from '../middleware/auth.js';
import { createAnalysisRoutes, createStartupRoutes } from './analysis.routes.js';
import { createAuthRoutes } from './auth.routes.js';
import { createIdeaRoutes } from './idea.routes.js';
import { createInvestorRoutes, createSessionRoutes } from './investor.routes.js';
import { createReportRoutes } from './report.routes.js';
import type { AppServices } from './context.js';

const log = createLogger('http');
const bootedAt = Date.now();

/**
 * Mount points come straight from the shared base paths, and `assertBases` fails
 * at boot if any endpoint constant no longer sits under its base. Without that
 * guard a renamed route would silently 404 instead of failing loudly.
 */
function assertBases(): void {
  const checks: [string, string][] = [
    [API_ROUTES.auth.guest, `${API_BASES.auth}/guest`],
    [API_ROUTES.auth.me, `${API_BASES.auth}/me`],
    [API_ROUTES.idea.analyze, `${API_BASES.idea}/analyze`],
    [API_ROUTES.investor.session, `${API_BASES.investor}/session`],
    [API_ROUTES.investor.answer, `${API_BASES.investor}/answer`],
    [API_ROUTES.investor.report, `${API_BASES.investor}/report`],
    [API_ROUTES.startups.list, API_BASES.startups],
    [API_ROUTES.health, API_BASES.health],
  ];

  for (const [actual, expected] of checks) {
    if (actual !== expected) {
      throw new Error(`Route constant "${actual}" does not match its base "${expected}".`);
    }
  }
  log.debug('route constants verified against shared bases');
}

export function createRouter(services: AppServices): Router {
  assertBases();

  const router = Router();
  const authenticate = createAuthMiddleware(services.auth);

  /* ── public ────────────────────────────────────────────────────────────── */

  router.get(
    API_ROUTES.health,
    asyncHandler(async (_req, res) => {
      const storeHealthy = await services.store.healthy().catch(() => false);

      const body: HealthResponse = {
        status: 'ok',
        uptimeSeconds: Math.round((Date.now() - bootedAt) / 1000),
        ai: {
          provider: capabilities.aiProvider,
          model: capabilities.aiModel,
          live: capabilities.aiProvider === 'gemini' && env.geminiConfigured,
        },
        data: { store: services.store.kind, live: storeHealthy },
        auth: { mode: capabilities.authMode },
        version: env.API_VERSION,
      };

      res.json({ ok: true, data: body });
    }),
  );

  // Auth routes are mounted before the guard so `/guest` and `/signin` work
  // without a token. Everything after this line requires one.
  router.use(API_BASES.auth, createAuthRoutes(services));

  /* ── authenticated ─────────────────────────────────────────────────────── */

  router.use(authenticate);

  router.get(
    API_ROUTES.auth.me,
    asyncHandler((req, res) => {
      res.json({ ok: true, data: { user: requireUser(req) } });
    }),
  );

  router.use(API_BASES.idea, createIdeaRoutes(services));
  router.use(API_BASES.analysis, createAnalysisRoutes(services));
  router.use(API_BASES.startups, createStartupRoutes(services));
  router.use(API_BASES.investor, createInvestorRoutes(services));
  router.use(API_BASES.session, createSessionRoutes(services));
  router.use(API_BASES.report, createReportRoutes(services));

  return router;
}
import { Router } from 'express';
import { errors } from '../core/errors.js';
import { asyncHandler, requireUser } from '../middleware/auth.js';
import type { AppServices } from './context.js';

/** Retrieval of a stored Builder Agent analysis, and re-running it. */
export function createAnalysisRoutes(services: AppServices): Router {
  const router = Router();

  // GET /api/analysis/:id — by analysis id.
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const user = requireUser(req);
      const { startup, analysis } = await services.builder.getAnalysis(user.id, req.params.id as string);

      res.json({
        ok: true,
        data: {
          startupId: startup.id,
          analysisId: analysis.id,
          idea: startup.idea,
          analysis: analysis.analysis,
          createdAt: analysis.createdAt,
        },
      });
    }),
  );

  return router;
}

/** Everything reachable from one startup: its analysis, session and report state. */
export function createStartupRoutes(services: AppServices): Router {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const user = requireUser(req);
      const startups = await services.store.listStartupsForUser(user.id);
      res.json({ ok: true, data: { startups } });
    }),
  );

  // GET /api/startups/:id — the dashboard's single entry point. One round trip
  // returns the idea, the analysis and whether the interview and report exist,
  // so the dashboard never has to coordinate three requests or render a
  // half-populated state.
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const user = requireUser(req);
      const startupId = req.params.id as string;

      const startup = await services.store.findStartupForUser(startupId, user.id);
      if (!startup) throw errors.startupNotFound();

      const [analysisRow, session, report] = await Promise.all([
        services.store.findLatestAnalysis(startupId),
        services.store.findLatestSession(startupId),
        services.store.findLatestReport(startupId),
      ]);

      res.json({
        ok: true,
        data: {
          startup: {
            id: startup.id,
            idea: startup.idea,
            startupName: startup.startupName,
            createdAt: startup.createdAt,
          },
          // Unwrapped here so the dashboard reads `analysis.scores` rather than
          // `analysis.analysis.scores` — the row wrapper is a storage detail.
          analysis: analysisRow
            ? {
                analysisId: analysisRow.id,
                analysis: analysisRow.analysis,
                createdAt: analysisRow.createdAt,
              }
            : null,
          session: session ? { id: session.id, status: session.status } : null,
          report: report ? { id: report.id, investorReadinessScore: report.investorReadinessScore } : null,
        },
      });
    }),
  );

  // POST /api/startups/:id/reanalyze
  router.post(
    '/:id/reanalyze',
    asyncHandler(async (req, res) => {
      const user = requireUser(req);
      const result = await services.builder.reanalyze(user.id, req.params.id as string);
      res.json({ ok: true, data: result });
    }),
  );

  return router;
}
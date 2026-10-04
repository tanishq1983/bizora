import { Router } from 'express';
import { asyncHandler, requireUser } from '../middleware/auth.js';
import type { AppServices } from './context.js';

/** Report Service — GET /api/report/:id, where the id is a startup or a report id. */
export function createReportRoutes(services: AppServices): Router {
  const router = Router();

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const user = requireUser(req);
      const report = await services.report.getByIdentifier(user.id, req.params.id as string);
      res.json({ ok: true, data: report });
    }),
  );

  return router;
}
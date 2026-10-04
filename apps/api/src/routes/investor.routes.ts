import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, requireUser, validateBody } from '../middleware/auth.js';
import type { AppServices } from './context.js';

const startSessionSchema = z.object({
  startupId: z.string().uuid().or(z.string().min(8)),
});

const submitAnswerSchema = z.object({
  sessionId: z.string().min(8),
  questionKey: z.enum(['why_now', 'competitive_advantage', 'customer_acquisition']),
  answer: z.string().trim().min(1),
});

/** Investor Agent Service — the interview itself. */
export function createInvestorRoutes(services: AppServices): Router {
  const router = Router();

  // POST /api/investor/session — starts (or resumes) the interview.
  router.post(
    '/session',
    validateBody(startSessionSchema),
    asyncHandler(async (req, res) => {
      const user = requireUser(req);
      const { startupId } = req.body as z.infer<typeof startSessionSchema>;

      const session = await services.investor.startSession(user.id, startupId);
      res.status(201).json({ ok: true, data: session });
    }),
  );

  // POST /api/investor/answer — evaluates one answer and advances the interview.
  router.post(
    '/answer',
    validateBody(submitAnswerSchema),
    asyncHandler(async (req, res) => {
      const user = requireUser(req);
      const body = req.body as z.infer<typeof submitAnswerSchema>;

      const result = await services.investor.submitAnswer(user.id, body.sessionId, body.questionKey, body.answer);
      res.json({ ok: true, data: result });
    }),
  );

  // POST /api/investor/report — generates the final assessment.
  router.post(
    '/report',
    validateBody(startSessionSchema),
    asyncHandler(async (req, res) => {
      const user = requireUser(req);
      const { startupId } = req.body as z.infer<typeof startSessionSchema>;

      const report = await services.report.generate(user.id, startupId);
      res.status(201).json({ ok: true, data: report });
    }),
  );

  return router;
}

/** GET /api/session/:id — the interview transcript plus the next question. */
export function createSessionRoutes(services: AppServices): Router {
  const router = Router();

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const user = requireUser(req);
      const session = await services.investor.getSession(user.id, req.params.id as string);
      res.json({ ok: true, data: session });
    }),
  );

  return router;
}
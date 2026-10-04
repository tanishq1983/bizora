import { Router } from 'express';
import { ideaInputSchema } from '@bizora/shared';
import { errors } from '../core/errors.js';
import { asyncHandler, requireUser, validateBody } from '../middleware/auth.js';
import type { AppServices } from './context.js';

/** Idea Service — validates and stores the startup idea, then runs the Builder Agent. */
export function createIdeaRoutes(services: AppServices): Router {
  const router = Router();

  router.post(
    '/analyze',
    asyncHandler(async (req, res) => {
      const parsed = ideaInputSchema.safeParse(req.body);
      if (!parsed.success) {
        throw errors.ideaTooShort(parsed.error.issues[0]?.message);
      }

      const user = requireUser(req);
      const result = await services.builder.analyzeIdea(user.id, parsed.data.idea);

      res.status(201).json({
        ok: true,
        data: result,
      });
    }),
  );

  /** Validate-only, used by the idea screen for inline feedback before submitting. */
  router.post(
    '/validate',
    validateBody(ideaInputSchema.partial()),
    asyncHandler((req, res) => {
      const parsed = ideaInputSchema.safeParse(req.body);
      res.json({
        ok: true,
        data: {
          valid: parsed.success,
          message: parsed.success ? null : (parsed.error.issues[0]?.message ?? null),
        },
      });
    }),
  );

  return router;
}
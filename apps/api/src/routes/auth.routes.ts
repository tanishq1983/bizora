import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, validateBody } from '../middleware/auth.js';
import type { AppServices } from './context.js';

const credentialsSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(8, 'Use at least 8 characters.'),
  displayName: z.string().trim().min(1).max(80).optional(),
});

/**
 * Guest provisioning takes no meaningful input, so an absent body must be
 * valid — a bare `POST /api/auth/guest` is the natural way to call it.
 */
const guestSchema = z
  .object({
    displayName: z.string().trim().min(1).max(80).optional(),
  })
  .optional();

/**
 * Auth Service routes.
 *
 * `/guest` exists so the product is usable with no configuration at all. When
 * Supabase Auth is configured the frontend signs in for real and this route
 * still works — it simply provisions the demo identity instead.
 *
 * Note: `/me` is deliberately NOT mounted here. It needs the bearer token to be
 * resolved first, so it is registered in routes/index.ts after the auth guard.
 */
export function createAuthRoutes(services: AppServices): Router {
  const router = Router();

  router.post(
    '/guest',
    validateBody(guestSchema),
    asyncHandler(async (req, res) => {
      const { displayName } = (req.body ?? {}) as { displayName?: string };
      const session = await services.auth.bootstrapGuest(displayName);
      res.status(201).json({ ok: true, data: session });
    }),
  );

  router.post(
    '/signup',
    validateBody(credentialsSchema),
    asyncHandler(async (req, res) => {
      const body = req.body as z.infer<typeof credentialsSchema>;
      const fallbackName = body.email.split('@')[0] ?? 'Founder';
      const session = await services.auth.signUp(body.email, body.password, body.displayName ?? fallbackName);
      res.status(201).json({ ok: true, data: session });
    }),
  );

  router.post(
    '/signin',
    validateBody(credentialsSchema),
    asyncHandler(async (req, res) => {
      const body = req.body as z.infer<typeof credentialsSchema>;
      const session = await services.auth.signIn(body.email, body.password);
      res.json({ ok: true, data: session });
    }),
  );

  return router;
}
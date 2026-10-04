import compression from 'compression';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { API_ROUTES } from '@bizora/shared';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { createRouter } from './routes/index.js';
import type { AppServices } from './routes/context.js';

export function createApp(services: AppServices): Express {
  const app = express();

  // Behind Railway / Vercel proxies.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      // The API serves JSON only and is never embedded in a page, so a strict
      // CSP here would add noise without adding safety.
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        // Same-origin and server-to-server requests arrive without an Origin.
        if (!origin) return callback(null, true);
        if (env.corsOrigins.includes('*') || env.corsOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`Origin ${origin} is not allowed by CORS.`));
      },
      credentials: true,
    }),
  );

  app.use(compression());
  app.use(express.json({ limit: '256kb' }));

  app.use((_req, res, next) => {
    res.setHeader('X-Bizora-Route', 'api');
    next();
  });

  app.get('/', (_req, res) => {
    res.json({
      ok: true,
      data: { name: 'Bizora API', tagline: 'From Startup Idea to Investor-Ready.', health: API_ROUTES.health },
    });
  });

  app.use(createRouter(services));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
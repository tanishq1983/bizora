import { createApp } from './app.js';
import { capabilities, env } from './config/env.js';
import { createLogger } from './core/logger.js';
import { getAiProvider } from './ai/index.js';
import { getDataStore } from './data/index.js';
import { AuthService } from './services/auth.service.js';
import { BuilderService } from './services/builder.service.js';
import { InvestorService } from './services/investor.service.js';
import { ReportService } from './services/report.service.js';

const log = createLogger('server');

async function main(): Promise<void> {
  const store = await getDataStore();
  const ai = getAiProvider();
  const auth = new AuthService(store);

  const services = {
    ai,
    store,
    auth,
    builder: new BuilderService(ai, store),
    investor: new InvestorService(ai, store),
    report: new ReportService(ai, store),
  };

  const app = createApp(services);

  const server = app.listen(env.PORT, () => {
    const aiNote =
      capabilities.aiProvider === 'gemini'
        ? `Gemini (${capabilities.aiModel}) with deterministic fallback`
        : 'deterministic provider — set GEMINI_API_KEY to enable Gemini';

    log.info('Bizora API listening', {
      port: env.PORT,
      ai: aiNote,
      store: store.kind,
      auth: capabilities.authMode,
      env: env.NODE_ENV,
    });

    if (capabilities.aiProvider !== 'gemini') {
      log.warn('running without GEMINI_API_KEY — analysis will be generated locally and clearly marked as an estimate');
    }
    if (store.kind !== 'supabase') {
      log.warn('running without Supabase — data is held in memory and will be lost on restart');
    }
  });

  const shutdown = (signal: string) => {
    log.info('shutting down', { signal });
    server.close(() => {
      void store.dispose().finally(() => process.exit(0));
    });
    // Do not wait forever on lingering connections.
    setTimeout(() => process.exit(1), 8000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    log.error('unhandled rejection', { reason: reason instanceof Error ? reason.message : String(reason) });
  });

  process.on('uncaughtException', (error) => {
    log.error('uncaught exception', { reason: error.message });
    process.exit(1);
  });
}

main().catch((error: unknown) => {
  log.error('failed to start', { reason: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
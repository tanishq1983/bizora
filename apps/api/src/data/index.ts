import { capabilities } from '../config/env.js';
import { createLogger } from '../core/logger.js';
import { MemoryDataStore } from './memory.store.js';
import { SupabaseDataStore } from './supabase.store.js';
import type { DataStore } from './store.js';

const log = createLogger('store');

/**
 * Wraps the configured store so a database outage degrades the request instead
 * of failing it.
 *
 * The fallback is read-mostly safe: it implements the same relationship rules,
 * so a request served from memory behaves identically. It cannot survive a
 * restart, so every fallback is logged loudly and surfaced through
 * `healthy()`, which the health endpoint reports.
 */
function withFallback(primary: DataStore, fallback: DataStore): DataStore {
  let degraded = false;

  const markDegraded = (operation: string, error: unknown): void => {
    if (!degraded) {
      degraded = true;
      log.error('primary data store failed — falling back to memory for the rest of this process', {
        operation,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const proxy: Record<string, unknown> = {
    kind: primary.kind,
    init: () => primary.init(),
    dispose: async () => {
      await Promise.allSettled([primary.dispose(), fallback.dispose()]);
    },
    healthy: async () => {
      if (degraded) return false;
      try {
        return await primary.healthy();
      } catch {
        return false;
      }
    },
  };

  const methods = [
    'upsertUser', 'findUserById', 'findUserByEmail',
    'createStartup', 'findStartup', 'findStartupForUser', 'updateStartupName', 'listStartupsForUser',
    'createAnalysis', 'findLatestAnalysis', 'findAnalysis',
    'createSession', 'findSession', 'findLatestSession', 'updateSessionStatus',
    'createResponse', 'findResponseByQuestion', 'listResponses',
    'createReport', 'findLatestReport',
  ] as const;

  for (const method of methods) {
    const run = async (...args: unknown[]): Promise<unknown> => {
      const call = (store: DataStore) => (store[method] as (...a: unknown[]) => unknown)(...args);

      if (degraded) return call(fallback);

      try {
        return await call(primary);
      } catch (error) {
        markDegraded(method, error);
        return call(fallback);
      }
    };

    proxy[method] = run;
  }

  return proxy as unknown as DataStore;
}

let cached: DataStore | undefined;

export async function getDataStore(): Promise<DataStore> {
  if (cached) return cached;

  if (capabilities.dataStore === 'supabase') {
    const primary = new SupabaseDataStore();
    try {
      await primary.init();
      cached = withFallback(primary, new MemoryDataStore());
      log.info('data store ready', { store: 'supabase', fallback: 'memory' });
    } catch (error) {
      primary.dispose().catch(() => undefined);
      log.error('supabase unavailable at boot, using the in-memory store', {
        reason: error instanceof Error ? error.message : String(error),
        hint: 'Check SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY and that db/schema.sql has been run.',
      });
      const memory = new MemoryDataStore();
      await memory.init();
      cached = memory;
    }
  } else {
    const memory = new MemoryDataStore();
    await memory.init();
    cached = memory;
  }

  return cached;
}
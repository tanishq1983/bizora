import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

/**
 * Environment is validated once at boot. A missing or malformed variable is a
 * startup failure with a readable report — never a runtime surprise three
 * requests into a demo.
 */

loadEnv({ quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'silent']).default('info'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  AI_PROVIDER: z.enum(['auto', 'gemini', 'mock']).default('auto'),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().min(1).default('gemini-3.8-flash'),
  AI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(180000).default(45000),

  DATA_STORE: z.enum(['auto', 'supabase', 'memory']).default('auto'),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  AUTH_MODE: z.enum(['auto', 'supabase', 'guest']).default('auto'),
  GUEST_TOKEN_SECRET: z.string().min(8).default('dev-only-insecure-secret-change-me'),

  API_VERSION: z.string().min(1).default('1.0.0'),
});

function readRaw(): Record<string, string | undefined> {
  const raw: Record<string, string | undefined> = {};
  for (const key of Object.keys(envSchema.shape)) {
    const value = process.env[key];
    if (value !== undefined && value.trim() !== '') raw[key] = value.trim();
  }
  return raw;
}

function parseEnv(): z.infer<typeof envSchema> {
  const result = envSchema.safeParse(readRaw());
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${lines.join('\n')}`);
  }
  return result.data;
}

const parsed = parseEnv();

const geminiConfigured = Boolean(parsed.GEMINI_API_KEY);
const supabaseConfigured = Boolean(parsed.SUPABASE_URL && parsed.SUPABASE_SERVICE_ROLE_KEY);

/**
 * `auto` resolves to whatever is actually configured. Every downstream service
 * receives a concrete adapter name, so nothing has to re-derive capability.
 */
function resolveAiProvider(): 'gemini' | 'mock' {
  if (parsed.AI_PROVIDER === 'gemini') {
    if (!geminiConfigured) {
      throw new Error('AI_PROVIDER=gemini but GEMINI_API_KEY is not set. Add the key or use AI_PROVIDER=auto.');
    }
    return 'gemini';
  }
  if (parsed.AI_PROVIDER === 'mock') return 'mock';
  return geminiConfigured ? 'gemini' : 'mock';
}

function resolveDataStore(): 'supabase' | 'memory' {
  if (parsed.DATA_STORE === 'supabase') {
    if (!supabaseConfigured) {
      throw new Error(
        'DATA_STORE=supabase but SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set. Add them or use DATA_STORE=auto.',
      );
    }
    return 'supabase';
  }
  if (parsed.DATA_STORE === 'memory') return 'memory';
  return supabaseConfigured ? 'supabase' : 'memory';
}

function resolveAuthMode(): 'supabase' | 'guest' {
  if (parsed.AUTH_MODE === 'supabase') {
    if (!supabaseConfigured) {
      throw new Error('AUTH_MODE=supabase but Supabase is not configured. Add credentials or use AUTH_MODE=auto.');
    }
    return 'supabase';
  }
  if (parsed.AUTH_MODE === 'guest') return 'guest';
  return supabaseConfigured ? 'supabase' : 'guest';
}

export const env = {
  ...parsed,
  isProduction: parsed.NODE_ENV === 'production',
  isDevelopment: parsed.NODE_ENV === 'development',
  geminiConfigured,
  supabaseConfigured,
  corsOrigins: parsed.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
} as const;

export const capabilities = {
  aiProvider: resolveAiProvider(),
  aiModel: parsed.GEMINI_MODEL,
  dataStore: resolveDataStore(),
  authMode: resolveAuthMode(),
} as const;

export type AiProviderName = 'gemini' | 'mock';
export type DataStoreName = 'supabase' | 'memory';
export type AuthModeName = 'supabase' | 'guest';
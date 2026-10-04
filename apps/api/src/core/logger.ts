import { env } from '../config/env.js';

type Level = 'debug' | 'info' | 'warn' | 'error';

const ORDER: Record<Level | 'silent', number> = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 };
const threshold = ORDER[env.LOG_LEVEL];

const PAINT: Record<Level, string> = {
  debug: '\x1b[90m',
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
};
const RESET = '\x1b[0m';
const DIM = '\x1b[2m';

function emit(level: Level, message: string, meta?: Record<string, unknown>): void {
  if (ORDER[level] < threshold) return;

  const time = new Date().toISOString().slice(11, 23);
  // Only a string scope is meaningful; anything else would stringify to
// "[object Object]" and pollute every line.
const scope = typeof meta?.scope === 'string' ? `${DIM}${meta.scope}${RESET} ` : '';
  const rest = meta ? { ...meta } : undefined;
  if (rest) delete rest.scope;

  const extra = rest && Object.keys(rest).length ? ` ${DIM}${JSON.stringify(rest)}${RESET}` : '';
  const line = `${DIM}${time}${RESET} ${PAINT[level]}${level.toUpperCase().padEnd(5)}${RESET} ${scope}${message}${extra}`;

  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  child(scope: string): Logger;
}

export function createLogger(scope: string): Logger {
  return {
    debug: (m, meta) => emit('debug', m, { ...meta, scope }),
    info: (m, meta) => emit('info', m, { ...meta, scope }),
    warn: (m, meta) => emit('warn', m, { ...meta, scope }),
    error: (m, meta) => emit('error', m, { ...meta, scope }),
    child: (child: string) => createLogger(`${scope}:${child}`),
  };
}

export const logger = createLogger('bizora');
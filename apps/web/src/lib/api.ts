const TOKEN_KEY = 'bizora.accessToken';
const USER_KEY = 'bizora.user';

const DEFAULT_TIMEOUT_MS = 45_000;

export const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/+$/, '');

export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}

/* ── Token storage ────────────────────────────────────────────────────────── */

export function readStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    // Private browsing or blocked storage. The session simply won't persist.
    return null;
  }
}

export function persistSession(accessToken: string, user: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TOKEN_KEY, accessToken);
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* non-fatal */
  }
}

export function readStoredUser<T>(): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function clearStoredSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  } catch {
    /* non-fatal */
  }
}

/* ── Errors ───────────────────────────────────────────────────────────────── */

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: unknown;
  readonly requestId: string | null;

  constructor(message: string, options: { code?: string; status?: number; details?: unknown; requestId?: string | null } = {}) {
    super(message);
    this.name = 'ApiClientError';
    this.code = options.code ?? 'NETWORK_ERROR';
    this.status = options.status ?? 0;
    this.details = options.details;
    this.requestId = options.requestId ?? null;
  }

  /** True when the request never reached the server, so retrying is sensible. */
  get isOffline(): boolean {
    return this.status === 0;
  }
}

interface FailureShape {
  ok?: boolean;
  error?: { code?: string; message?: string; details?: unknown; requestId?: string };
}

export interface ApiRequestInit {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
  timeoutMs?: number;
}

/**
 * Calls the Bizora API and unwraps the response envelope.
 *
 * Every non-2xx response becomes an {@link ApiClientError} carrying the server's
 * error code, so callers can branch on `error.code` (e.g. `SESSION_COMPLETE`)
 * instead of pattern-matching message text.
 */
export async function apiRequest<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const { method = 'GET', body, token, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = init;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);
  const onExternalAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', onExternalAbort, { once: true });

  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      cache: 'no-store',
    });
  } catch {
    const aborted = controller.signal.aborted;
    throw new ApiClientError(
      aborted
        ? 'That took longer than expected. Check your connection and try again.'
        : 'Could not reach the Bizora API. Check that the server is running.',
      { code: aborted ? 'TIMEOUT' : 'NETWORK_ERROR' },
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onExternalAbort);
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new ApiClientError('The API returned a response we could not read.', {
        code: 'BAD_RESPONSE',
        status: response.status,
      });
    }
  }

  if (!response.ok) {
    const failure = (payload ?? {}) as FailureShape;
    throw new ApiClientError(failure.error?.message ?? `Request failed with status ${response.status}.`, {
      code: failure.error?.code,
      status: response.status,
      details: failure.error?.details,
      requestId: failure.error?.requestId,
    });
  }

  const success = (payload ?? {}) as { data?: T };
  return success.data as T;
}
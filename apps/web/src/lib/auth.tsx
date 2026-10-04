'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { API_ROUTES, type AuthUser } from '@bizora/shared';

import {
  apiRequest,
  clearStoredSession,
  persistSession,
  readStoredToken,
  readStoredUser,
} from './api';

type AuthStatus = 'loading' | 'ready';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  /** Whether this identity is a throwaway demo account rather than a real signup. */
  isGuest: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  /**
   * Performs an authenticated request, provisioning a guest identity first if
   * none exists. Every page uses this instead of calling apiRequest directly, so
   * no screen ever has to handle "not logged in yet".
   */
  request: <T>(path: string, init?: { method?: 'GET' | 'POST'; body?: unknown; signal?: AbortSignal }) => Promise<T>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  // Read through a ref so `ensureToken` sees the token that hydration installed
  // rather than the value captured before it awaited.
  const tokenRef = useRef<string | null>(null);

  // Concurrent callers must not each provision a separate guest identity.
  const pending = useRef<Promise<{ user: AuthUser; accessToken: string }> | null>(null);

  // One in-flight hydration, shared by every effect run.
  const hydrating = useRef<Promise<void> | null>(null);

  /**
   * Resolves when the initial hydration has finished. Pages render on their very
   * first pass, before that outcome is known — without this gate a refresh would
   * provision a throwaway guest identity and 404 on data belonging to the real
   * session. Created once, on first render, so waiters cannot be orphaned by a
   * later render replacing the promise.
   */
  const hydrated = useRef<{ promise: Promise<void>; open: () => void } | null>(null);
  hydrated.current ??= (() => {
    let open: () => void = () => {};
    const promise = new Promise<void>((resolve) => {
      open = resolve;
    });
    return { promise, open };
  })();

  const adopt = useCallback((session: { user: AuthUser; accessToken: string }) => {
    persistSession(session.accessToken, session.user);
    tokenRef.current = session.accessToken;
    setUser(session.user);
  }, []);

  const provisionGuest = useCallback(async (): Promise<{ user: AuthUser; accessToken: string }> => {
    if (!pending.current) {
      pending.current = apiRequest<{ user: AuthUser; accessToken: string }>(API_ROUTES.auth.guest, { method: 'POST' });
    }
    try {
      const session = await pending.current;
      adopt(session);
      return session;
    } finally {
      pending.current = null;
    }
  }, [adopt]);

  /**
   * Establishes the session once, no matter how many times the effect runs.
   *
   * Awaits nothing and throws nothing: failure degrades to "no session" so the
   * gate still opens and pages can surface their own errors.
   */
  const hydrate = useCallback(async (): Promise<void> => {
    if (hydrating.current) return hydrating.current;

    hydrating.current = (async () => {
      const storedToken = readStoredToken();

      if (storedToken) {
        try {
          const me = await apiRequest<{ user: AuthUser }>(API_ROUTES.auth.me, { token: storedToken });
          // The token is proven valid, so it becomes the active one before the
          // gate opens — otherwise a concurrent request would provision a guest
          // and orphan every startup this founder owns.
          tokenRef.current = storedToken;
          adopt({ user: me.user, accessToken: storedToken });
          return;
        } catch {
          clearStoredSession();
        }
      }

      // Show the cached identity immediately so the shell never flashes a
      // signed-out state while the guest call is in flight.
      const cached = readStoredUser<AuthUser>();
      if (cached) setUser(cached);

      try {
        await provisionGuest();
      } catch {
        setUser(null);
      }
    })().finally(() => {
      hydrating.current = null;
    });

    return hydrating.current;
  }, [adopt, provisionGuest]);

  // Hydrate on mount: reuse a stored session if it is still valid, otherwise
  // fall back to a guest identity so the demo works with zero setup.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        await hydrate();
      } finally {
        // Only the live run may open the gate. A cancelled run — StrictMode
        // deliberately double-invokes effects — has not established a token
        // yet, and opening early would hand a fresh guest to waiting requests.
        if (!cancelled) {
          setStatus('ready');
          hydrated.current?.open();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  const ensureToken = useCallback(async (): Promise<string> => {
    await (hydrated.current?.promise ?? Promise.resolve());
    if (tokenRef.current) return tokenRef.current;
    const session = await provisionGuest();
    return session.accessToken;
  }, [provisionGuest]);

  const request = useCallback(
    <T,>(path: string, init: { method?: 'GET' | 'POST'; body?: unknown; signal?: AbortSignal } = {}) => {
      return (async () => {
        const activeToken = await ensureToken();
        return apiRequest<T>(path, { ...init, token: activeToken });
      })();
    },
    [ensureToken],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const session = await apiRequest<{ user: AuthUser; accessToken: string }>(API_ROUTES.auth.signIn, {
        method: 'POST',
        body: { email, password },
      });
      adopt(session);
    },
    [adopt],
  );

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      const session = await apiRequest<{ user: AuthUser; accessToken: string }>(API_ROUTES.auth.signUp, {
        method: 'POST',
        body: { email, password, displayName },
      });
      adopt(session);
    },
    [adopt],
  );

  const signOut = useCallback(async () => {
    clearStoredSession();
    tokenRef.current = null;
    setUser(null);
    try {
      await provisionGuest();
    } catch {
      /* the header degrades to signed-out if even guest provisioning fails */
    }
  }, [provisionGuest]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isGuest: user?.mode === 'guest',
      signIn,
      signUp,
      signOut,
      request,
    }),
    [status, user, signIn, signUp, signOut, request],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}

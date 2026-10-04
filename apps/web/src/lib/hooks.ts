'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { API_ROUTES, type HealthResponse } from '@bizora/shared';

import { apiRequest } from './api';
import { useAuth } from './auth';
import { ApiClientError } from './api';

/**
 * Client pages can't export `metadata`, so the tab title is set imperatively.
 * Kept here rather than repeated in every page.
 */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} · Bizora`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}

interface AsyncState<T> {
  data: T | null;
  error: ApiClientError | null;
  loading: boolean;
  reload: () => void;
}

function toApiError(cause: unknown): ApiClientError {
  if (cause instanceof ApiClientError) return cause;
  return new ApiClientError(cause instanceof Error ? cause.message : 'Something went wrong.');
}

/**
 * In-flight loads, keyed by cache key.
 *
 * The shell and a page often want the same resource, and StrictMode runs every
 * effect twice, so without this a single page load fires the same request three
 * or four times. The promise is dropped as soon as it settles so a later mount
 * still refetches.
 */
const inFlight = new Map<string, Promise<unknown>>();

function share<T>(cacheKey: string, run: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(cacheKey);
  if (existing) return existing as Promise<T>;

  const promise = run().finally(() => {
    inFlight.delete(cacheKey);
  });
  inFlight.set(cacheKey, promise);
  return promise;
}

/**
 * Runs an abortable async read whenever `key` changes, cancelling the previous
 * run so a slow response can never overwrite a newer one.
 *
 * Loading is *derived* from the key stored alongside the data rather than set
 * imperatively: if the stored key no longer matches, the result is stale by
 * definition and the caller is loading again. That avoids a render in which old
 * data is briefly shown under a new key.
 */
export function useAsync<T>(loader: (signal: AbortSignal) => Promise<T>, key: string): AsyncState<T> {
  // Identity is part of the key: results belong to a user, so a sign-in or
  // sign-out must invalidate them.
  const { user, status } = useAuth();
  const cacheKey = `${key}|${user?.id ?? 'anonymous'}`;

  // Nothing is fetched before the session settles. Firing early would load the
  // resource under `anonymous` and then immediately reload it once the real
  // identity arrives.
  const sessionReady = status === 'ready';

  const [nonce, setNonce] = useState(0);
  // The initial key can never match a real one, so the first render is loading.
  const [state, setState] = useState<{ key: string; data: T | null; error: ApiClientError | null }>({
    key: '',
    data: null,
    error: null,
  });

  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  useEffect(() => {
    if (!sessionReady) return;
    let active = true;

    // Deliberately not abortable: the request may be shared with another
    // component, so one consumer unmounting must not cancel it for the rest.
    // `active` still guarantees a stale response is never written.
    share(cacheKey, () => loaderRef.current(new AbortController().signal))
      .then((data) => {
        if (active) setState({ key: cacheKey, data: data as T, error: null });
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setState({ key: cacheKey, data: null, error: toApiError(cause) });
      });

    return () => {
      active = false;
    };
  }, [cacheKey, nonce, sessionReady]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  const settled = state.key === cacheKey;
  return {
    data: settled ? state.data : null,
    error: settled ? state.error : null,
    loading: !settled,
    reload,
  };
}

let capabilitiesCache: HealthResponse | null = null;
let capabilitiesInFlight: Promise<HealthResponse> | null = null;

/** Health is identical for every visitor, so it is fetched once per tab. */
export function useCapabilities(): HealthResponse | null {
  const [health, setHealth] = useState<HealthResponse | null>(capabilitiesCache);

  useEffect(() => {
    if (capabilitiesCache) return;
    if (!capabilitiesInFlight) {
      capabilitiesInFlight = apiRequest<HealthResponse>(API_ROUTES.health, { timeoutMs: 8_000 }).finally(() => {
        capabilitiesInFlight = null;
      });
    }

    let active = true;
    capabilitiesInFlight
      .then((result) => {
        capabilitiesCache = result;
        if (active) setHealth(result);
      })
      .catch(() => {
        /* The badge is informational; a failure must not break the page. */
      });

    return () => {
      active = false;
    };
  }, []);

  return health;
}

/** The founder's startups, for the workspace list. */
export function useStartups<T>() {
  const { request } = useAuth();
  return useAsync<{ startups: T[] }>(
    (signal) => request<{ startups: T[] }>(API_ROUTES.startups.list, { signal }),
    'startups',
  );
}
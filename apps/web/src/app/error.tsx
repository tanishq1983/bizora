'use client';

import { useEffect } from 'react';

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-page max-w-3xl py-20">
      <div className="rounded-card bg-white px-8 py-12 text-center shadow-soft">
        <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-rose-100 text-lg text-rose-600" aria-hidden="true">
          ▲
        </div>

        <h1 className="mt-5 text-xl font-bold tracking-tight text-ink-900">This page ran into a problem</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600">
          The error has been logged. Try again — if it keeps happening, the analysis may still be reachable from your
          workspace.
        </p>

        {error.digest ? <p className="mt-3 font-mono text-xs text-slate-400">Reference: {error.digest}</p> : null}

        <button
          type="button"
          onClick={reset}
          className="mt-7 inline-flex h-11 items-center rounded-xl bg-gradient-to-b from-brand-500 to-brand-700 px-5 text-sm font-semibold text-white transition hover:from-brand-400 hover:to-brand-600"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
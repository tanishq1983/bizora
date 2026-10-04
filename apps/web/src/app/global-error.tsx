'use client';

import { useEffect } from 'react';
import Link from 'next/link';

import { APP_ROUTES } from '@bizora/shared';

import { buttonClasses } from '@/components/ui/button';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // In production this is where the error would go to Sentry or similar.
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-dvh items-center justify-center bg-ink-950 px-6">
        <main className="w-full max-w-lg rounded-card bg-white px-8 py-10 text-center shadow-lift">
          <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-rose-100 text-lg text-rose-600" aria-hidden="true">
            ▲
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink-900">Something broke on our side</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-slate-600">
            The page failed to render. Your analysis is safe — reloading usually fixes this.
          </p>

          {error.digest ? <p className="mt-3 font-mono text-xs text-slate-400">Reference: {error.digest}</p> : null}

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <button type="button" onClick={reset} className={buttonClasses('primary', 'md')}>
              Try again
            </button>
            <Link href={APP_ROUTES.home} className={buttonClasses('secondary', 'md')}>
              Back to home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
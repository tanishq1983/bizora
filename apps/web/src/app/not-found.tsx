import Link from 'next/link';

import { APP_ROUTES } from '@bizora/shared';

import { buttonClasses } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="container-page flex max-w-2xl flex-col items-center py-24 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-300">404</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">This page does not exist</h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-slate-300">
        The link may be from an analysis that no longer exists — guest sessions are cleared when the server restarts.
      </p>

      <div className="mt-9 flex flex-col gap-3 sm:flex-row">
        <Link href={APP_ROUTES.workspace} className={buttonClasses('primary', 'lg')}>
          Go to your workspace
        </Link>
        <Link href={APP_ROUTES.home} className={buttonClasses('subtle', 'lg')}>
          Back to home
        </Link>
      </div>
    </div>
  );
}
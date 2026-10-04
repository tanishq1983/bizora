'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { APP_ROUTES } from '@bizora/shared';

import { cn } from '@/lib/cn';
import { useAuth } from '@/lib/auth';
import { useCapabilities } from '@/lib/hooks';
import { buttonClasses } from '@/components/ui/button';
import { Logo } from './logo';

const NAV = [
  { href: APP_ROUTES.home, label: 'Product' },
  { href: APP_ROUTES.workspace, label: 'Workspace' },
  { href: APP_ROUTES.validate, label: 'New analysis' },
];

/** Small pill telling the viewer whether the numbers are live or deterministic. */
function ModeBadge() {
  const health = useCapabilities();
  if (!health) return null;

  const live = health.ai.live;
  return (
    <span
      title={live ? 'Gemini is answering live.' : 'No Gemini key detected — using the deterministic demo provider.'}
      className={cn(
        'hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset sm:inline-flex',
        live
          ? 'bg-jade-500/10 text-jade-300 ring-jade-400/25'
          : 'bg-amber-400/10 text-amber-300 ring-amber-400/25',
      )}
    >
      <span className={cn('size-1.5 rounded-full', live ? 'bg-jade-400' : 'bg-amber-400')} aria-hidden="true" />
      {live ? 'Live AI' : 'Demo AI'}
    </span>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { status, user, isGuest, signOut } = useAuth();

  const isActive = (href: string) => (href === APP_ROUTES.home ? pathname === '/' : pathname.startsWith(href));

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-ink-950/80 backdrop-blur-xl">
        <div className="container-page flex h-16 items-center gap-6">
          <Link href={APP_ROUTES.home} className="rounded-lg" aria-label="Bizora home">
            <Logo />
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition',
                  isActive(item.href) ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <ModeBadge />

            {status === 'loading' ? (
              <div className="h-9 w-24 skeleton" aria-hidden="true" />
            ) : user ? (
              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="max-w-[14ch] truncate text-sm font-semibold text-white">{user.displayName}</p>
                  {isGuest ? <p className="text-[11px] font-medium text-slate-400">Demo session</p> : null}
                </div>

                <span
                  aria-hidden="true"
                  className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-iris-500 to-brand-600 text-sm font-bold text-white"
                >
                  {user.displayName.trim().charAt(0).toUpperCase() || '?'}
                </span>

                {isGuest ? (
                  <Link href={APP_ROUTES.login} className={buttonClasses('secondary', 'sm')}>
                    Sign in
                  </Link>
                ) : (
                  <button type="button" onClick={signOut} className={buttonClasses('ghost', 'sm')}>
                    Sign out
                  </button>
                )}
              </div>
            ) : (
              <Link href={APP_ROUTES.login} className={buttonClasses('primary', 'sm')}>
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>

      <footer className="mt-24 border-t border-white/8 py-10">
        <div className="container-page flex flex-col gap-4 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Bizora. Estimates and scores are directional, not investment advice.</p>
          <nav aria-label="Footer" className="flex gap-5">
            <Link href={APP_ROUTES.workspace} className="transition hover:text-white">
              Workspace
            </Link>
            <Link href={APP_ROUTES.validate} className="transition hover:text-white">
              New analysis
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
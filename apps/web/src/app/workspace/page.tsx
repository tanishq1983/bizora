'use client';

import Link from 'next/link';

import { APP_ROUTES, type StartupSummary } from '@bizora/shared';

import { cn } from '@/lib/cn';
import { useDocumentTitle, useStartups } from '@/lib/hooks';
import { Badge, ScoreBadge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { Alert, EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback';

const SESSION_LABEL: Record<string, string> = {
  not_started: 'Interview not started',
  in_progress: 'Interview in progress',
  completed: 'Interview complete',
};

function StartupRow({ startup }: { startup: StartupSummary }) {
  // A finished report is the more useful destination, so it wins.
  const target = startup.hasReport ? APP_ROUTES.report(startup.id) : APP_ROUTES.dashboard(startup.id);
  const action = startup.hasReport ? 'View report' : startup.sessionStatus === 'in_progress' ? 'Continue' : 'Open';

  return (
    <li>
      <Link
        href={target}
        className="group flex flex-col gap-4 rounded-card bg-white px-5 py-5 shadow-soft ring-1 ring-slate-200/70 transition hover:shadow-lift sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold tracking-tight text-ink-900 transition group-hover:text-brand-700">
              {startup.startupName ?? 'Untitled analysis'}
            </h3>
            <ScoreBadge score={startup.overallScore} />
            {startup.hasReport ? <Badge tone="jade">Report ready</Badge> : null}
          </div>

          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-600">{startup.idea}</p>

          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>{new Date(startup.createdAt).toLocaleDateString()}</span>
            {startup.sessionStatus ? <span>· {SESSION_LABEL[startup.sessionStatus] ?? startup.sessionStatus}</span> : null}
          </p>
        </div>

        <span className={cn('shrink-0 text-sm font-semibold text-brand-600 transition group-hover:text-brand-700')}>
          {action} →
        </span>
      </Link>
    </li>
  );
}

export default function WorkspacePage() {
  useDocumentTitle('Workspace');

  const { data, error, loading, reload } = useStartups<StartupSummary>();
  const count = data?.startups.length ?? 0;

  return (
    <div className="container-page max-w-4xl py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-300">Your work</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Workspace</h1>
          <p className="mt-2 text-sm text-slate-300">Every idea you have taken through Bizora.</p>
        </div>

        <Link href={APP_ROUTES.validate} className={buttonClasses('primary', 'md')}>
          New analysis
        </Link>
      </div>

      <div className="mt-9">
        {loading ? (
          <ul className="space-y-3">
            {[0, 1, 2].map((index) => (
              <li key={index} className="rounded-card bg-white px-5 py-5 shadow-soft ring-1 ring-slate-200/70">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="mt-3 h-4 w-11/12" />
                <Skeleton className="mt-2 h-4 w-2/3" />
              </li>
            ))}
          </ul>
        ) : error ? (
          <ErrorState title="We could not load your workspace" message={error.message} onRetry={reload} />
        ) : count === 0 ? (
          <EmptyState
            title="Nothing here yet"
            message="Run your first idea through the Builder Agent and it will appear here, with its analysis, interview and report."
            action={
              <Link href={APP_ROUTES.validate} className={buttonClasses('primary', 'md')}>
                Analyse an idea
              </Link>
            }
          />
        ) : (
          <ul className="space-y-3">
            {data?.startups.map((startup) => (
              <StartupRow key={startup.id} startup={startup} />
            ))}
          </ul>
        )}
      </div>

      {!loading && count > 0 ? (
        <Alert tone="info" className="mt-6">
          Guest sessions live in server memory and disappear when the server restarts. Sign in to keep your work.
        </Alert>
      ) : null}
    </div>
  );
}
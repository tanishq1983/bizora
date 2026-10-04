'use client';

import { cn } from '@/lib/cn';

const ALERT: Record<'info' | 'success' | 'warning' | 'error', string> = {
  info: 'bg-brand-50 text-brand-900 ring-brand-500/25',
  success: 'bg-jade-50 text-jade-700 ring-jade-500/25',
  warning: 'bg-amber-400/10 text-amber-700 ring-amber-500/30',
  error: 'bg-rose-100 text-rose-700 ring-rose-500/25',
};

const ICON: Record<'info' | 'success' | 'warning' | 'error', string> = {
  info: 'ℹ',
  success: '✓',
  warning: '!',
  error: '▲',
};

export function Alert({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: 'info' | 'success' | 'warning' | 'error';
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-xl px-4 py-3 text-sm ring-1 ring-inset', ALERT[tone], className)}
    >
      <span aria-hidden="true" className="mt-px font-bold leading-5">
        {ICON[tone]}
      </span>
      <div className="min-w-0 leading-relaxed">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn(Boolean(title) && 'mt-1', 'opacity-90')}>{children}</div> : null}
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden="true" />;
}

/** Loading placeholder that announces itself once, rather than N shimmering boxes. */
export function LoadingBlock({ label = 'Loading', rows = 3, className }: { label?: string; rows?: number; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn('space-y-3', className)}>
      <span className="sr-only">{label}…</span>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className={cn('h-4', index === 0 ? 'w-1/3' : index % 2 === 0 ? 'w-11/12' : 'w-full')} />
      ))}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
}: {
  title?: string;
  message?: string | null;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn('rounded-card bg-white px-6 py-10 text-center shadow-soft ring-1 ring-slate-200/70', className)}>
      <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-rose-100 text-lg text-rose-600" aria-hidden="true">
        ▲
      </div>
      <h3 className="mt-4 text-base font-bold text-ink-900">{title}</h3>
      {message ? <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">{message}</p> : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex h-10 items-center rounded-xl bg-white px-5 text-sm font-semibold text-ink-900 ring-1 ring-inset ring-slate-250 shadow-soft transition hover:bg-slate-25"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, message, action, className }: { title: string; message: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-card border border-dashed border-white/15 bg-white/5 px-6 py-14 text-center', className)}>
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-300">{message}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
'use client';

import { JOURNEY_PIPELINE, type JourneyStageKey } from '@bizora/shared';

import { cn } from '@/lib/cn';

/**
 * The persistent progress rail. Shown on every stage after the idea so the
 * founder always knows where they are and what comes next.
 */
export function JourneyRail({ current }: { current: JourneyStageKey }) {
  const activeIndex = JOURNEY_PIPELINE.findIndex((stage) => stage.key === current);

  return (
    <nav aria-label="Progress" className="w-full overflow-x-auto scrollbar-slim">
      <ol className="flex min-w-max items-center gap-1.5">
        {JOURNEY_PIPELINE.map((stage, index) => {
          const done = index < activeIndex;
          const active = index === activeIndex;

          return (
            <li key={stage.key} className="flex items-center gap-1.5">
              <span
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition',
                  active
                    ? 'bg-white text-ink-900 ring-white'
                    : done
                      ? 'bg-brand-500/15 text-brand-200 ring-brand-400/30'
                      : 'text-slate-400 ring-white/10',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-4 items-center justify-center rounded-full text-[10px]',
                    active ? 'bg-ink-900 text-white' : done ? 'bg-brand-400 text-ink-950' : 'bg-white/10 text-slate-400',
                  )}
                >
                  {done ? '✓' : index + 1}
                </span>
                {stage.label}
                {active ? <span className="sr-only">(current step)</span> : null}
              </span>

              {index < JOURNEY_PIPELINE.length - 1 ? (
                <span aria-hidden="true" className={cn('h-px w-5', done ? 'bg-brand-400/50' : 'bg-white/12')} />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
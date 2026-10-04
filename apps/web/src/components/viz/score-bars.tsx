import { SCORE_KEYS, SCORE_LABELS, type SubScores } from '@bizora/shared';

import { cn } from '@/lib/cn';
import { toneForScore } from '@/lib/format';

const BAR: Record<string, string> = {
  jade: 'bg-jade-500',
  brand: 'bg-brand-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  neutral: 'bg-slate-300',
};

/** One labelled horizontal bar. `aria-hidden` because the row text carries the value. */
function Bar({ value, tone }: { value: number; tone: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-150" aria-hidden="true">
      <div
        className={cn('h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none', BAR[tone])}
        style={{ width: `${Math.max(2, value)}%` }}
      />
    </div>
  );
}

export function ScoreBars({
  scores,
  className,
  showOverall = false,
}: {
  scores: SubScores & { overall?: number };
  className?: string;
  showOverall?: boolean;
}) {
  const rows: { key: string; label: string; value: number }[] = SCORE_KEYS.map((key) => ({
    key,
    label: SCORE_LABELS[key],
    value: scores[key],
  }));

  if (showOverall && typeof scores.overall === 'number') {
    rows.push({ key: 'overall', label: 'Overall', value: scores.overall });
  }

  const max = showOverall ? 100 : 10;

  return (
    <dl className={cn('space-y-4', className)}>
      {rows.map(({ key, label, value }) => (
        <div key={key} className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-sm font-medium text-slate-700">{label}</dt>
            <dd className="text-sm font-bold tabular-nums text-ink-900">
              {value}
              <span className="ml-0.5 text-xs font-medium text-slate-400">/{max}</span>
            </dd>
          </div>
          <Bar value={max === 100 ? value : value * 10} tone={toneForScore(max === 100 ? value : value * 10)} />
        </div>
      ))}
    </dl>
  );
}

/**
 * Readiness is 40% Builder Agent + 60% founder answers. Showing the split stops
 * the final score from looking like a black box.
 */
export function BreakdownBar({ builderPoints, answerPoints, className }: { builderPoints: number; answerPoints: number; className?: string }) {
  const total = builderPoints + answerPoints;
  const builderShare = total === 0 ? 40 : (builderPoints / total) * 100;

  return (
    <div className={cn('space-y-2.5', className)}>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-150" aria-hidden="true">
        <div className="h-full bg-gradient-to-r from-brand-500 to-brand-400 transition-[width] duration-700 motion-reduce:transition-none" style={{ width: `${builderShare}%` }} />
        <div className="h-full flex-1 bg-gradient-to-r from-iris-500 to-iris-400" />
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
        <span className="inline-flex items-center gap-2 text-slate-600">
          <span className="size-2.5 rounded-sm bg-gradient-to-br from-brand-500 to-brand-400" aria-hidden="true" />
          Builder Agent
          <strong className="font-bold tabular-nums text-ink-900">{builderPoints} pts</strong>
          <span className="text-slate-400">(40%)</span>
        </span>
        <span className="inline-flex items-center gap-2 text-slate-600">
          <span className="size-2.5 rounded-sm bg-gradient-to-br from-iris-500 to-iris-400" aria-hidden="true" />
          Your answers
          <strong className="font-bold tabular-nums text-ink-900">{answerPoints} pts</strong>
          <span className="text-slate-400">(60%)</span>
        </span>
      </div>
    </div>
  );
}
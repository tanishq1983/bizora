import type { ReadinessBand } from '@bizora/shared';

import { cn } from '@/lib/cn';
import { toneForBand, toneForScore, type Tone } from '@/lib/format';

/** Literal class strings — Tailwind cannot see anything assembled at runtime. */
const PILL: Record<Tone, string> = {
  jade: 'bg-jade-50 text-jade-700 ring-jade-500/25',
  brand: 'bg-brand-50 text-brand-700 ring-brand-500/25',
  amber: 'bg-amber-400/15 text-amber-700 ring-amber-500/30',
  rose: 'bg-rose-100 text-rose-700 ring-rose-500/25',
  iris: 'bg-iris-50 text-iris-700 ring-iris-500/25',
  neutral: 'bg-slate-150 text-slate-600 ring-slate-300',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset whitespace-nowrap',
        PILL[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ScoreBadge({ score, suffix = '/100', className }: { score: number | null; suffix?: string; className?: string }) {
  return (
    <Badge tone={toneForScore(score)} className={className}>
      {score === null ? '—' : score}
      <span className="font-medium opacity-70">{suffix}</span>
    </Badge>
  );
}

export function BandBadge({ band, label }: { band: ReadinessBand; label: string }) {
  return (
    <Badge tone={toneForBand(band)} className="uppercase tracking-wide">
      {label}
    </Badge>
  );
}
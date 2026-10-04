import { cn } from '@/lib/cn';
import { toneForScore, type Tone } from '@/lib/format';

const STROKE: Record<Tone, string> = {
  jade: 'stroke-jade-500',
  brand: 'stroke-brand-500',
  amber: 'stroke-amber-500',
  rose: 'stroke-rose-500',
  iris: 'stroke-iris-500',
  neutral: 'stroke-slate-300',
};

const TEXT: Record<Tone, string> = {
  jade: 'text-jade-600',
  brand: 'text-brand-600',
  amber: 'text-amber-600',
  rose: 'text-rose-600',
  iris: 'text-iris-600',
  neutral: 'text-slate-500',
};

/**
 * The headline score dial.
 *
 * Drawn as SVG rather than a chart library: it is one circle, it needs to stay
 * crisp at any size, and the label has to sit inside it for screen readers.
 */
export function ScoreRing({
  score,
  size = 168,
  thickness = 12,
  caption,
  className,
}: {
  score: number | null;
  size?: number;
  thickness?: number;
  caption?: string;
  className?: string;
}) {
  const safe = score === null || Number.isNaN(score) ? 0 : Math.max(0, Math.min(100, score));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const tone = toneForScore(score);

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="presentation">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          className="stroke-slate-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          className={cn(STROKE[tone], 'transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none')}
          style={{ strokeDashoffset: circumference - (safe / 100) * circumference }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={cn('font-bold leading-none tracking-tight tabular-nums', TEXT[tone])} style={{ fontSize: size * 0.26 }}>
          {score === null ? '—' : score}
        </span>
        <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {caption ?? 'out of 100'}
        </span>
      </div>

      <span className="sr-only">
        {score === null ? 'Score unavailable' : `Score ${score} out of 100`}
      </span>
    </div>
  );
}
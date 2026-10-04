import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
type Size = 'sm' | 'md' | 'lg';

/*
 * Written out as literal strings rather than composed from a map: Tailwind
 * scans source text for class names, so a computed `${base} ${variant}` would
 * never be generated.
 */
const VARIANT: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-brand-500 to-brand-700 text-white shadow-[0_1px_0_0_rgba(255,255,255,0.18)_inset,0_10px_24px_-12px_rgba(36,86,235,0.9)] hover:from-brand-400 hover:to-brand-600 active:from-brand-600 active:to-brand-800',
  secondary:
    'bg-white text-ink-900 ring-1 ring-inset ring-slate-250 shadow-soft hover:bg-slate-25 hover:ring-slate-300 active:bg-slate-150',
  subtle:
    'bg-ink-800/80 text-slate-100 ring-1 ring-inset ring-white/10 hover:bg-ink-700 hover:ring-white/20',
  ghost: 'text-slate-300 hover:bg-white/5 hover:text-white active:bg-white/10',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-700',
};

const SIZE: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-13 px-7 text-base gap-2.5',
};

const BASE =
  'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-150 select-none disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none';

export function buttonClasses(variant: Variant = 'primary', size: Size = 'md', extra?: string): string {
  return cn(BASE, VARIANT[variant], SIZE[size], extra);
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export function Button({ variant = 'primary', size = 'md', loading = false, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, size, cn(className, loading && 'cursor-progress'))}
    >
      {loading ? <Spinner className="size-4" /> : null}
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
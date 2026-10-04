import { cn } from '@/lib/cn';

export function Logo({ className, markOnly = false }: { className?: string; markOnly?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="relative flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-brand-400 via-brand-600 to-iris-600 shadow-[0_6px_16px_-8px_rgba(36,86,235,0.9)]">
        <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" aria-hidden="true">
          <path d="M5 16.5 12 5l7 11.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8.5 16.5h7" stroke="white" strokeOpacity="0.65" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>

      {markOnly ? null : (
        <span className="text-[17px] font-bold tracking-tight text-white">
          Bizora
        </span>
      )}
    </span>
  );
}
import { cn } from '@/lib/cn';

export function Card({
  children,
  className,
  as: Tag = 'section',
}: {
  children: React.ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'article' | 'aside';
}) {
  return (
    <Tag className={cn('rounded-card bg-white text-ink-900 shadow-soft ring-1 ring-slate-200/70', className)}>{children}</Tag>
  );
}

export function CardHeader({ title, description, action, className }: { title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-4 border-b border-slate-150 px-6 py-5', className)}>
      <div className="min-w-0">
        <h2 className="text-base font-bold tracking-tight text-ink-900">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-relaxed text-slate-600">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-6 py-6', className)}>{children}</div>;
}

/** Section title used on the navy shell, above white cards. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: 'left' | 'center';
  className?: string;
}) {
  return (
    <div className={cn(align === 'center' && 'mx-auto max-w-2xl text-center', className)}>
      {eyebrow ? (
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-brand-300">{eyebrow}</p>
      ) : null}
      <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h2>
      {description ? <p className="mt-3 text-base leading-relaxed text-slate-300">{description}</p> : null}
    </div>
  );
}
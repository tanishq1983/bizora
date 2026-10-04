'use client';

import { useId } from 'react';

import { cn } from '@/lib/cn';

const CONTROL =
  'w-full rounded-xl bg-white px-4 text-[15px] text-ink-900 ring-1 ring-inset ring-slate-250 shadow-sm transition placeholder:text-slate-400 hover:ring-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none disabled:bg-slate-150 disabled:text-slate-500';

interface FieldProps {
  label: string;
  hint?: React.ReactNode;
  error?: string | null;
  required?: boolean;
  children: (props: { id: string; describedBy: string | undefined; invalid: boolean }) => React.ReactNode;
}

/**
 * Wraps a control with its label, hint and error text, wiring up `aria-describedby`
 * and `aria-invalid` so screen readers announce the same information sighted users
 * see.
 */
export function Field({ label, hint, error, required, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-ink-900">
        {label}
        {required ? (
          <span className="ml-1 text-rose-600" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      {children({ id, describedBy, invalid: Boolean(error) })}

      {hint ? (
        <p id={hintId} className="text-xs leading-relaxed text-slate-500">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-xs font-medium text-rose-600">
          <span aria-hidden="true">▲</span>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({ invalid, className, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      {...rest}
      aria-invalid={invalid || undefined}
      className={cn(CONTROL, 'h-11', invalid && 'ring-2 ring-rose-500', className)}
    />
  );
}

export function TextArea({
  invalid,
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      {...rest}
      aria-invalid={invalid || undefined}
      className={cn(CONTROL, 'resize-y py-3 leading-relaxed', invalid && 'ring-2 ring-rose-500', className)}
    />
  );
}

export function Select({ invalid, className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select {...rest} aria-invalid={invalid || undefined} className={cn(CONTROL, 'h-11 pr-9', invalid && 'ring-2 ring-rose-500', className)}>
      {children}
    </select>
  );
}
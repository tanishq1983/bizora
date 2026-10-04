'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { API_ROUTES, APP_ROUTES, DEMO_IDEAS, MAX_IDEA_LENGTH, MIN_IDEA_LENGTH, type AnalyzeIdeaResponse } from '@bizora/shared';

import { ApiClientError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';
import { Field, TextArea } from '@/components/ui/field';

const ANALYSING_STAGES = [
  'Reading your idea for the real problem',
  'Naming the startup and sizing the market',
  'Mapping the competitive landscape',
  'Costing a 90-day MVP roadmap',
  'Scoring five dimensions',
];

export default function ValidatePage() {
  const router = useRouter();
  const { request } = useAuth();

  const [idea, setIdea] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stageIndex, setStageIndex] = useState(0);

  // Advance the visible progress while the request is in flight, but cap it so
  // the list never runs past the end while waiting.
  useEffect(() => {
    if (!submitting) return;
    const timer = setInterval(() => {
      setStageIndex((current) => Math.min(current + 1, ANALYSING_STAGES.length - 1));
    }, 900);
    return () => clearInterval(timer);
  }, [submitting]);

  const trimmed = idea.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_IDEA_LENGTH;
  const tooLong = trimmed.length > MAX_IDEA_LENGTH;
  const lengthError =
    trimmed.length === 0
      ? null
      : tooShort
        ? `Add a little more — at least ${MIN_IDEA_LENGTH} characters (${trimmed.length} so far).`
        : tooLong
          ? `That is ${trimmed.length} characters; the limit is ${MAX_IDEA_LENGTH}.`
          : null;

  const canSubmit = trimmed.length >= MIN_IDEA_LENGTH && trimmed.length <= MAX_IDEA_LENGTH && !submitting;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setTouched(true);
      setError(null);

      if (!canSubmit) return;

      setSubmitting(true);
      setStageIndex(0);

      try {
        const result = await request<AnalyzeIdeaResponse>(API_ROUTES.idea.analyze, {
          method: 'POST',
          body: { idea: trimmed },
        });

        if (!mounted.current) return;
        router.push(APP_ROUTES.dashboard(result.startupId));
      } catch (cause) {
        if (!mounted.current) return;
        setSubmitting(false);
        setError(
          cause instanceof ApiClientError ? cause.message : 'The analysis failed unexpectedly. Please try again.',
        );
      }
    },
    [canSubmit, request, router, trimmed],
  );

  const showError = (touched && trimmed.length === 0) || tooShort || tooLong;

  return (
    <div className="container-page max-w-4xl py-16">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-300">Step 1 of 4</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">What are you building?</h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-300">
          Describe the problem, who it affects, and what you intend to build. Plain language is better than pitch language.
        </p>
      </div>

      <Card className="mt-10">
        <CardBody>
          <form onSubmit={submit} noValidate className="space-y-7">
            <Field
              label="Your startup idea"
              required
              error={showError ? lengthError : null}
              hint={`${trimmed.length} / ${MAX_IDEA_LENGTH} characters`}
            >
              {({ id, describedBy, invalid }) => (
                <TextArea
                  id={id}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  rows={7}
                  value={idea}
                  disabled={submitting}
                  onChange={(event) => setIdea(event.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder="e.g. A mobile app that helps first-time home buyers detect mould and moisture problems before they sign a contract, using photos and local rainfall data."
                  className="text-base"
                />
              )}
            </Field>

            {error ? <Alert tone="error">{error}</Alert> : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-relaxed text-slate-500">
                Your analysis is private to your workspace.
              </p>
              <Button type="submit" size="lg" loading={submitting} disabled={!canSubmit} className="sm:min-w-52">
                {submitting ? 'Analysing' : 'Run the Builder Agent'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Demo seeds — the fastest way to see the whole product. */}
      <section className="mt-10">
        <h2 className="text-sm font-semibold text-white">Or start from an example</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {DEMO_IDEAS.map((demo, index) => (
            <li key={demo.idea}>
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setIdea(demo.idea);
                  setTouched(false);
                  setError(null);
                }}
                className={cn(
                  'h-full w-full rounded-card bg-white/5 p-4 text-left ring-1 ring-inset ring-white/10 transition',
                  'hover:bg-white/10 hover:ring-white/20 disabled:cursor-not-allowed disabled:opacity-50',
                )}
              >
                <span className="block text-sm font-semibold text-white">{demo.label}</span>
                <span className="mt-1.5 block text-xs leading-relaxed text-slate-300">
                  {index === 0 ? 'The canonical demo. ' : ''}
                  {demo.idea.length > 110 ? `${demo.idea.slice(0, 110).trimEnd()}…` : demo.idea}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Progress overlay: the analysis takes a moment, so show the work. */}
      {submitting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/85 p-6 backdrop-blur-sm">
          <div role="status" aria-live="polite" className="w-full max-w-md rounded-card bg-white p-8 shadow-lift">
            <div className="flex items-center gap-3">
              <span className="relative flex size-10 items-center justify-center rounded-full bg-brand-50">
                <span className="absolute inset-0 animate-ping rounded-full bg-brand-400/40" aria-hidden="true" />
                <svg viewBox="0 0 24 24" className="relative size-5 text-brand-600" fill="none" aria-hidden="true">
                  <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
              <div>
                <h2 className="font-bold tracking-tight text-ink-900">Builder Agent is working</h2>
                <p className="text-xs text-slate-500">This usually takes under a minute.</p>
              </div>
            </div>

            <ol className="mt-7 space-y-3">
              {ANALYSING_STAGES.map((stage, index) => {
                const done = index < stageIndex;
                const active = index === stageIndex;

                return (
                  <li
                    key={stage}
                    className={cn(
                      'flex items-center gap-3 text-sm transition-opacity duration-300',
                      active ? 'font-semibold text-ink-900' : done ? 'text-slate-600' : 'text-slate-400 opacity-50',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                        done
                          ? 'bg-jade-500 text-white'
                          : active
                            ? 'bg-brand-600 text-white'
                            : 'bg-slate-150 text-slate-400',
                      )}
                    >
                      {done ? '✓' : index + 1}
                    </span>
                    {stage}
                    {active ? <span className="sr-only">(in progress)</span> : null}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      ) : null}
    </div>
  );
}
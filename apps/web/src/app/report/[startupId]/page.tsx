'use client';

import { use, useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  API_ROUTES,
  APP_ROUTES,
  NEXT_STEP_LABELS,
  READINESS_BAND_COPY,
  type GenerateReportResponse,
  type InvestorReport,
} from '@bizora/shared';

import { ApiClientError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAsync, useDocumentTitle } from '@/lib/hooks';
import { cn } from '@/lib/cn';
import { JourneyRail } from '@/components/layout/journey-rail';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Alert, ErrorState, LoadingBlock } from '@/components/ui/feedback';
import { BreakdownBar } from '@/components/viz/score-bars';
import { ScoreRing } from '@/components/viz/score-ring';

const CATEGORY_TONE: Record<string, 'jade' | 'brand' | 'iris' | 'amber'> = {
  validate: 'jade',
  build: 'brand',
  research: 'iris',
  improve: 'amber',
};

export default function ReportPage({ params }: { params: Promise<{ startupId: string }> }) {
  const { startupId } = use(params);
  const router = useRouter();
  const { request } = useAuth();

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const { data, error, loading, reload } = useAsync<GenerateReportResponse>(
    (signal) => request<GenerateReportResponse>(API_ROUTES.report.byId(startupId), { signal }),
    `report:${startupId}`,
  );

  useDocumentTitle(data ? 'Investor readiness report' : 'Report');

  const regenerate = useCallback(async () => {
    setGenerating(true);
    setGenerateError(null);

    try {
      const result = await request<GenerateReportResponse>(API_ROUTES.investor.report, {
        method: 'POST',
        body: { startupId },
      });
      reload();
      return result;
    } catch (cause) {
      setGenerateError(cause instanceof ApiClientError ? cause.message : 'Could not regenerate the report.');
      return null;
    } finally {
      setGenerating(false);
    }
  }, [reload, request, startupId]);

  if (loading) {
    return (
      <div className="container-page max-w-5xl py-16">
        <Card>
          <CardBody>
            <LoadingBlock label="Loading your report" rows={5} />
          </CardBody>
        </Card>
      </div>
    );
  }

  // A 404 here usually means the interview was never finished, so offer the
  // route back rather than a dead end.
  if (error || !data) {
    return (
      <div className="container-page max-w-3xl py-20">
        <div className="space-y-5">
          <ErrorState
            title="No report yet"
            message={error?.message ?? 'Finish the three-question interview first, then generate your report.'}
            onRetry={reload}
          />
          <div className="flex justify-center gap-3">
            <Link href={APP_ROUTES.dashboard(startupId)} className={buttonClasses('secondary', 'md')}>
              Back to the analysis
            </Link>
            <Link href={APP_ROUTES.workspace} className={buttonClasses('subtle', 'md')}>
              Workspace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const report: InvestorReport = data.report;
  const bandCopy = READINESS_BAND_COPY[report.readinessBand];

  return (
    <div className="container-page max-w-5xl py-12">
      <div className="mb-8">
        <JourneyRail current="report" />
      </div>

      {/* ── Headline ──────────────────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-700 to-iris-700"
          />
          <div className="relative flex flex-col items-center gap-7 px-6 py-10 text-center sm:flex-row sm:gap-10 sm:px-10 sm:text-left">
            <div className="rounded-full bg-white/95 p-2 shadow-lift">
              <ScoreRing score={report.investorReadinessScore} size={148} thickness={12} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-200">Step 4 of 4 · Final report</p>

              <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Investor readiness: {report.investorReadinessScore}/100
              </h1>

              <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white ring-1 ring-inset ring-white/25">
                {bandCopy.label}
              </span>

              <p className="mt-4 text-[15px] leading-relaxed text-brand-50">{bandCopy.blurb}</p>

              <p className="mt-3 text-xs text-brand-200">
                Generated {new Date(report.generatedAt).toLocaleString()}
                {report.degraded ? ' · fallback provider' : ''}
              </p>
            </div>
          </div>
        </div>

        <CardBody className="space-y-5">
          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">How this number was reached</h2>
            <BreakdownBar
              className="mt-3"
              builderPoints={report.scoreBreakdown.builderContribution}
              answerPoints={report.scoreBreakdown.answerContribution}
            />
            <p className="mt-3 text-xs text-slate-500">
              {Math.round(report.scoreBreakdown.builderWeight * 100)}% Builder Agent analysis,{' '}
              {Math.round(report.scoreBreakdown.answerWeight * 100)}% your three answers.
            </p>
          </div>
        </CardBody>
      </Card>

      {/* ── Narrative ─────────────────────────────────────────────────────── */}
      <Card className="mt-6">
        <CardHeader title="Investor feedback" description="The assessment as an investor would deliver it." />
        <CardBody>
          <p className="text-[15px] leading-[1.75] text-slate-700">{report.overallFeedback}</p>
        </CardBody>
      </Card>

      {/* ── Strengths / weaknesses ────────────────────────────────────────── */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader
            title="Key strengths"
            description="What an investor would lean on."
            action={
              <span className="flex size-8 items-center justify-center rounded-full bg-jade-50 font-bold text-jade-600" aria-hidden="true">
                ✓
              </span>
            }
          />
          <CardBody>
            <ul className="space-y-3.5">
              {report.strengths.map((strength) => (
                <li key={strength} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                  <span className="mt-[3px] font-bold text-jade-600" aria-hidden="true">
                    ✓
                  </span>
                  {strength}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Gaps to close"
            description="Where the story is still thin."
            action={
              <span className="flex size-8 items-center justify-center rounded-full bg-rose-100 font-bold text-rose-600" aria-hidden="true">
                ▲
              </span>
            }
          />
          <CardBody>
            <ul className="space-y-3.5">
              {report.weaknesses.map((weakness) => (
                <li key={weakness} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                  <span className="mt-[3px] font-bold text-rose-600" aria-hidden="true">
                    ▲
                  </span>
                  {weakness}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      {/* ── Suggestions ───────────────────────────────────────────────────── */}
      <Card className="mt-6">
        <CardHeader title="What to do next" description="The highest-leverage actions, in the investor's order." />
        <CardBody className="space-y-3">
          {report.suggestions.map((suggestion) => (
            <p key={suggestion} className="flex gap-3 text-sm leading-relaxed text-slate-700">
              <span className="mt-[3px] font-bold text-brand-600" aria-hidden="true">
                →
              </span>
              {suggestion}
            </p>
          ))}
        </CardBody>
      </Card>

      {/* ── Next steps ────────────────────────────────────────────────────── */}
      <Card className="mt-6">
        <CardHeader title="Next steps" description="Concrete tasks, grouped by what they unblock." />
        <CardBody>
          <ol className="grid gap-4 sm:grid-cols-2">
            {report.nextSteps.map((step, index) => (
              <li key={step.title} className="rounded-xl bg-slate-25 p-4 ring-1 ring-inset ring-slate-200">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-6 items-center justify-center rounded-full bg-ink-900 text-[11px] font-bold text-white">
                    {index + 1}
                  </span>
                  <Badge tone={CATEGORY_TONE[step.category] ?? 'neutral'}>{NEXT_STEP_LABELS[step.category]}</Badge>
                </div>
                <h3 className="mt-3 font-bold tracking-tight text-ink-900">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{step.detail}</p>
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      {generateError ? (
        <Alert tone="error" className="mt-6">
          {generateError}
        </Alert>
      ) : null}

      <div className={cn('mt-8 flex flex-col items-center gap-4', 'sm:flex-row sm:justify-center')}>
        <button type="button" onClick={regenerate} disabled={generating} className={buttonClasses('secondary', 'md')}>
          {generating ? 'Regenerating…' : 'Regenerate report'}
        </button>
        <Link href={APP_ROUTES.dashboard(startupId)} className={buttonClasses('primary', 'md')}>
          Back to the analysis
        </Link>
        <button
          type="button"
          onClick={() => router.push(APP_ROUTES.validate)}
          className={buttonClasses('ghost', 'md', 'text-slate-300')}
        >
          Analyse a new idea
        </button>
      </div>
    </div>
  );
}
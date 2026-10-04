'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';

import { API_ROUTES, APP_ROUTES, type CreateSessionResponse, type StartupBundleResponse } from '@bizora/shared';

import { ApiClientError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAsync, useDocumentTitle } from '@/lib/hooks';
import { JourneyRail } from '@/components/layout/journey-rail';
import {
  BusinessProfileCard,
  CompetitorCard,
  CostRevenueCard,
  MarketCard,
  RoadmapCard,
  ScoreOverview,
} from '@/components/analysis/analysis-cards';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { ErrorState, LoadingBlock } from '@/components/ui/feedback';

export default function DashboardPage({ params }: { params: Promise<{ startupId: string }> }) {
  const { startupId } = use(params);
  const router = useRouter();
  const { request } = useAuth();

  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const { data, error, loading, reload } = useAsync<StartupBundleResponse>(
    (signal) => request<StartupBundleResponse>(API_ROUTES.startups.byId(startupId), { signal }),
    `startup:${startupId}`,
  );

  useDocumentTitle(data?.startup.startupName ?? 'Analysis');

  /**
   * One entry point for every downstream state. Starting a session is
   * idempotent per startup on the server, so this safely resumes an unfinished
   * interview, continues a completed one, or opens the report when it exists.
   */
  async function continueJourney() {
    setStarting(true);
    setStartError(null);

    try {
      const session = await request<CreateSessionResponse>(API_ROUTES.investor.session, {
        method: 'POST',
        body: { startupId },
      });

      router.push(
        session.status === 'completed' && data?.report
          ? APP_ROUTES.report(startupId)
          : APP_ROUTES.investor(session.sessionId),
      );
    } catch (cause) {
      setStarting(false);
      setStartError(cause instanceof ApiClientError ? cause.message : 'Could not start the interview.');
    }
  }

  const startup = data?.startup;
  const builder = data?.analysis?.analysis;
  const session = data?.session;
  const report = data?.report;
  const interviewDone = session?.status === 'completed';

  if (loading) {
    return (
      <div className="container-page max-w-6xl py-16">
        <div className="rounded-card bg-white px-6 py-8 shadow-soft ring-1 ring-slate-200/70">
          <LoadingBlock label="Loading the Builder Agent analysis" rows={5} />
        </div>
      </div>
    );
  }

  if (error || !startup || !builder) {
    return (
      <div className="container-page max-w-3xl py-20">
        <ErrorState
          title="We could not load this analysis"
          message={error?.message ?? 'This startup has no analysis yet.'}
          onRetry={reload}
        />
      </div>
    );
  }

  return (
    <div className="container-page max-w-6xl py-12">
      <div className="mb-8">
        <JourneyRail current="analysis" />
      </div>

      <div className="space-y-6">
        <ScoreOverview
          scores={builder.scores}
          estimateNotice={builder.estimateNotice}
          degraded={builder.degraded}
          startupName={builder.startupName}
          summary={builder.summary}
        />

        <BusinessProfileCard profile={builder.businessProfile} />

        <div className="grid gap-6 lg:grid-cols-2">
          <MarketCard market={builder.marketOpportunity} />
          <CostRevenueCard cost={builder.costRevenue} />
        </div>

        <CompetitorCard snapshot={builder.competitors} />

        <RoadmapCard roadmap={builder.mvpRoadmap} />

        {/* The single most important element on the page: the way forward. */}
        <Card className="overflow-hidden">
          <CardBody className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-iris-600">Step 2 of 4</p>
              <h2 className="mt-1.5 text-xl font-bold tracking-tight text-ink-900">
                {report
                  ? 'Your investor readiness report is ready'
                  : interviewDone
                    ? 'You have finished the interview'
                    : 'Now the part founders skip'}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
                {report
                  ? 'Your final report combines the Builder Agent analysis with your answers. You can re-read it whenever you like.'
                  : interviewDone
                    ? 'Generate your final investor-readiness report — a 40/60 blend of this analysis and how you answered.'
                    : 'Three fixed questions, scored on clarity, market understanding and financial reasoning. The same three, every time, so your score is comparable.'}
              </p>

              {startError ? (
                <p role="alert" className="mt-3 text-sm font-medium text-rose-600">
                  {startError}
                </p>
              ) : null}
            </div>

            <Button size="lg" loading={starting} onClick={continueJourney} className="shrink-0">
              {report ? 'View your report' : interviewDone ? 'Generate the report' : 'Face the Investor Agent'}
              <span aria-hidden="true">→</span>
            </Button>
          </CardBody>
        </Card>

        <p className="text-center text-xs text-slate-500">
          Idea submitted {new Date(startup.createdAt).toLocaleString()} ·{' '}
          <button
            type="button"
            onClick={() => router.push(APP_ROUTES.validate)}
            className="font-semibold text-brand-300 underline-offset-2 hover:underline"
          >
            Analyse a different idea
          </button>
        </p>
      </div>
    </div>
  );
}
import type { BusinessProfile, CompetitorSnapshot, CostRevenue, MarketOpportunity, MvpRoadmap, Scores } from '@bizora/shared';

import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';
import { ScoreBars } from '@/components/viz/score-bars';
import { ScoreRing } from '@/components/viz/score-ring';

export function ScoreOverview({ scores, estimateNotice, degraded, startupName, summary }: { scores: Scores; estimateNotice: string; degraded: boolean; startupName: string; summary: string }) {
  return (
    <Card>
      <div className="grid gap-8 px-6 py-7 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-10 sm:px-8">
        <div className="flex flex-col items-center gap-4">
          <ScoreRing score={scores.overall} size={172} />
          <Badge tone={degraded ? 'amber' : 'iris'}>{degraded ? 'Fallback provider' : 'Builder Agent'}</Badge>
        </div>

        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">{startupName}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-700">{summary}</p>

          <ScoreBars scores={scores} showOverall className="mt-7" />
        </div>
      </div>

      <div className="border-t border-slate-150 px-6 py-4 sm:px-8">
        <Alert tone="info">{estimateNotice}</Alert>
      </div>
    </Card>
  );
}

function ListBlock({ title, items, tone = 'neutral' }: { title: string; items: readonly string[]; tone?: 'neutral' | 'jade' }) {
  const bullet = tone === 'jade' ? 'bg-jade-500' : 'bg-brand-500';

  return (
    <div>
      <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{title}</h4>
      <ul className="mt-2.5 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-slate-700">
            <span className={cn('mt-[7px] size-1.5 shrink-0 rounded-full', bullet)} aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Prose({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</h4>
      <p className="mt-2 text-sm leading-relaxed text-slate-700">{children}</p>
    </div>
  );
}

export function BusinessProfileCard({ profile }: { profile: BusinessProfile }) {
  return (
    <Card>
      <CardHeader title="Business profile" description="What you are building, for whom, and how it makes money." />
      <CardBody className="space-y-5">
        <Prose label="The problem">{profile.problem}</Prose>
        <Prose label="The solution">{profile.solution}</Prose>
        <Prose label="Value proposition">{profile.valueProposition}</Prose>

        <div className="grid gap-5 sm:grid-cols-2">
          <ListBlock title="Target users" items={profile.targetUsers} />
          <Prose label="Business model">{profile.businessModel}</Prose>
        </div>
      </CardBody>
    </Card>
  );
}

export function MarketCard({ market }: { market: MarketOpportunity }) {
  return (
    <Card>
      <CardHeader title="Market opportunity" description="Who pays, what they pay today, and where it can grow." />
      <CardBody className="space-y-5">
        <Prose label="Target market">{market.targetMarket}</Prose>
        <Prose label="The need">{market.marketNeed}</Prose>
        <Prose label="The opportunity">{market.opportunity}</Prose>
        <ListBlock title="Where it can grow" items={market.growthAreas} />
      </CardBody>
    </Card>
  );
}

export function CompetitorCard({ snapshot }: { snapshot: CompetitorSnapshot }) {
  return (
    <Card>
      <CardHeader title="Competitive landscape" description="Who already does this, what they do well, and where they leave room." />
      <CardBody className="space-y-6">
        <ul className="grid gap-4 sm:grid-cols-2">
          {snapshot.competitors.map((competitor) => (
            <li key={competitor.name} className="rounded-xl bg-slate-25 p-4 ring-1 ring-inset ring-slate-200">
              <h4 className="font-bold tracking-tight text-ink-900">{competitor.name}</h4>

              <div className="mt-3 space-y-2">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-jade-600">Strengths</p>
                  <ul className="mt-1.5 space-y-1">
                    {competitor.strengths.map((strength) => (
                      <li key={strength} className="flex gap-2 text-[13px] leading-relaxed text-slate-700">
                        <span className="mt-0.5 font-bold text-jade-600" aria-hidden="true">
                          ✓
                        </span>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600">Gaps</p>
                  <ul className="mt-1.5 space-y-1">
                    {competitor.gaps.map((gap) => (
                      <li key={gap} className="flex gap-2 text-[13px] leading-relaxed text-slate-700">
                        <span className="mt-0.5 font-bold text-rose-600" aria-hidden="true">
                          ▲
                        </span>
                        {gap}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="rounded-xl bg-brand-50 p-5 ring-1 ring-inset ring-brand-500/20">
          <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-700">Your differentiation</h4>
          <p className="mt-2 text-sm leading-relaxed text-brand-900">{snapshot.differentiation}</p>
        </div>
      </CardBody>
    </Card>
  );
}

export function RoadmapCard({ roadmap }: { roadmap: MvpRoadmap }) {
  return (
    <Card>
      <CardHeader title="90-day MVP roadmap" description="Three phases, what ships in each, and what could go wrong." />
      <CardBody>
        <ol className="relative space-y-8 pl-8">
          {/* The spine of the timeline. */}
          <span aria-hidden="true" className="absolute bottom-4 left-[13px] top-4 w-px bg-slate-200" />

          {roadmap.phases.map((phase, index) => (
            <li key={phase.phase} className="relative">
              <span
                aria-hidden="true"
                className="absolute -left-8 flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-[11px] font-bold text-white ring-4 ring-white"
              >
                {index + 1}
              </span>

              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h4 className="font-bold tracking-tight text-ink-900">{phase.title}</h4>
                <Badge tone="neutral">{phase.duration}</Badge>
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-600">{phase.phase}</span>
              </div>

              <p className="mt-2 text-sm leading-relaxed text-slate-700">{phase.focus}</p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <ListBlock title="Deliverables" items={phase.deliverables} />
                <ListBlock title="Key risks" items={phase.keyRisks} tone="jade" />
              </div>
            </li>
          ))}
        </ol>
      </CardBody>
    </Card>
  );
}

export function CostRevenueCard({ cost }: { cost: CostRevenue }) {
  return (
    <Card>
      <CardHeader title="Cost & revenue" description="Directional estimates for the first version, not quotes." />
      <CardBody className="space-y-5">
        <dl className="grid gap-4 sm:grid-cols-2">
          {[
            ['Development cost', cost.developmentCost],
            ['Monthly operating cost', cost.operatingCost],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-25 p-4 ring-1 ring-inset ring-slate-200">
              <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed font-medium text-ink-900">{value}</dd>
            </div>
          ))}
        </dl>

        <ListBlock title="Revenue streams" items={cost.revenueStreams} />
        <Prose label="Monetisation model">{cost.monetizationModel}</Prose>
      </CardBody>
    </Card>
  );
}
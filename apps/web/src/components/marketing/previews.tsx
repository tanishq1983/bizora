import Link from 'next/link';

import { APP_ROUTES, INVESTOR_QUESTIONS, READINESS_BAND_COPY } from '@bizora/shared';

import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScoreBars } from '@/components/viz/score-bars';
import { ScoreRing } from '@/components/viz/score-ring';

/**
 * A static composition of what a real analysis looks like. Using the actual
 * score components here means the hero can never drift from the product.
 */
export function AnalysisPreview() {
  const scores = {
    marketPotential: 8,
    problemSolutionFit: 7,
    innovation: 6,
    feasibility: 8,
    revenuePotential: 7,
    overall: 72,
  };

  const competitors = ['Notion', 'Coda', 'Obsidian', 'Slite'];

  return (
    <div className="relative">
      {/* Glow behind the card so it lifts off the navy shell. */}
      <div
        aria-hidden="true"
        className="animate-drift absolute -inset-8 rounded-[2.5rem] bg-gradient-to-tr from-brand-500/25 via-iris-500/15 to-transparent blur-2xl"
      />

      <Card className="relative overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b border-slate-150 px-6 py-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge tone="iris">Builder Agent</Badge>
              <span className="text-[11px] font-medium text-slate-400">just now</span>
            </div>
            <h3 className="mt-2 truncate text-xl font-bold tracking-tight text-ink-900">Teamline Loop</h3>
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-600">
              AI project briefs that turn a rough request into a scoped, costed plan before engineering picks up a ticket.
            </p>
          </div>
          <ScoreRing score={scores.overall} size={92} thickness={9} />
        </div>

        <div className="grid gap-6 px-6 py-6 sm:grid-cols-2">
          <ScoreBars scores={scores} />

          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Competitive landscape</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {competitors.map((name) => (
                  <li
                    key={name}
                    className="rounded-lg bg-slate-150 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-250"
                  >
                    {name}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">90-day roadmap</p>
              <ol className="mt-2 space-y-1.5">
                {[
                  ['Weeks 1–3', 'Validate with 8 design partners'],
                  ['Weeks 4–8', 'Ship the brief generator'],
                  ['Weeks 9–12', 'Integrate with Jira and Linear'],
                ].map(([label, detail]) => (
                  <li key={label} className="flex gap-2.5 text-xs text-slate-600">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
                    <span>
                      <span className="font-semibold text-ink-900">{label}</span> · {detail}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-150 bg-slate-25 px-6 py-4">
          <p className="text-xs text-slate-500">
            Ready for the <span className="font-semibold text-ink-900">Investor Agent</span>?
          </p>
          <span className={buttonClasses('primary', 'sm')}>Answer 3 questions</span>
        </div>
      </Card>
    </div>
  );
}

/** The three canonical questions, shown as the product's signature. */
export function QuestionList() {
  return (
    <ol className="space-y-3">
      {INVESTOR_QUESTIONS.map((question, index) => (
        <li key={question.key} className="flex gap-4 rounded-card bg-white p-5 shadow-soft ring-1 ring-slate-200/70">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink-900 text-sm font-bold text-white">
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-ink-900">{question.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{question.prompt}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              <span className="font-semibold text-slate-600">Looking for:</span> {question.lookingFor}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ReportPreview() {
  const band = 'promising' as const;
  const copy = READINESS_BAND_COPY[band];

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-6 border-b border-slate-150 px-6 py-6 sm:flex-nowrap">
        <ScoreRing score={78} size={116} thickness={11} />
        <div className="min-w-0 flex-1">
          <Badge tone="brand" className="uppercase tracking-wide">
            {copy.label}
          </Badge>
          <h3 className="mt-2.5 text-lg font-bold tracking-tight text-ink-900">Investor readiness: 78/100</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{copy.blurb}</p>
        </div>
      </div>

      <div className="grid gap-6 px-6 py-6 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-jade-600">Key strengths</p>
          <ul className="mt-2.5 space-y-2">
            {['Clear wedge in a crowded category', 'Founder shows real distribution instincts', 'Costs are modelled, not guessed'].map(
              (item) => (
                <li key={item} className="flex gap-2 text-sm leading-relaxed text-slate-700">
                  <span className="mt-0.5 font-bold text-jade-600" aria-hidden="true">
                    ✓
                  </span>
                  {item}
                </li>
              ),
            )}
          </ul>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-rose-600">Gaps to close</p>
          <ul className="mt-2.5 space-y-2">
            {['No pricing experiment has been run', 'Retention assumption is unverified', 'Second market entry is unfunded'].map((item) => (
              <li key={item} className="flex gap-2 text-sm leading-relaxed text-slate-700">
                <span className="mt-0.5 font-bold text-rose-600" aria-hidden="true">
                  ▲
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-150 bg-slate-25 px-6 py-4">
        <Link href={APP_ROUTES.validate} className={buttonClasses('secondary', 'sm')}>
          Run your own analysis
        </Link>
      </div>
    </Card>
  );
}
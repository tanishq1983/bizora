import {
  DIMENSION_BLURBS,
  DIMENSION_LABELS,
  EVALUATION_DIMENSIONS,
  type AnswerEvaluation,
  type FounderResponse,
  type InvestorQuestionKey,
} from '@bizora/shared';

import { cn } from '@/lib/cn';
import { toneForScore } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader } from '@/components/ui/card';

/** 0–10 dimensions, shown on the same 0–100 colour scale as the startup scores. */
function MetricBar({ value }: { value: number }) {
  const tone = toneForScore(value * 10);
  const bar = tone === 'jade' ? 'bg-jade-500' : tone === 'brand' ? 'bg-brand-500' : tone === 'amber' ? 'bg-amber-500' : 'bg-rose-500';
  const text = tone === 'jade' ? 'text-jade-600' : tone === 'brand' ? 'text-brand-600' : tone === 'amber' ? 'text-amber-600' : 'text-rose-600';

  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-150" aria-hidden="true">
        <div className={cn('h-full rounded-full transition-[width] duration-500', bar)} style={{ width: `${value * 10}%` }} />
      </div>
      <span className={cn('text-sm font-bold tabular-nums', text)}>
        {value}
        <span className="text-xs font-medium text-slate-400">/10</span>
      </span>
    </div>
  );
}

export function EvaluationCard({
  evaluation,
  questionTitle,
  compact = false,
}: {
  evaluation: AnswerEvaluation;
  questionTitle: string;
  compact?: boolean;
}) {
  return (
    <Card className={compact ? 'overflow-hidden' : 'overflow-hidden'}>
      <CardHeader
        title="Investor Agent evaluation"
        description={`How your answer to “${questionTitle}” was scored.`}
        action={<Badge tone={toneForScore(evaluation.averageScore * 10)}>{evaluation.averageScore.toFixed(1)} avg</Badge>}
      />

      <CardBody className="space-y-6">
        <div className="grid gap-5 sm:grid-cols-3">
          {EVALUATION_DIMENSIONS.map((dimension) => (
            <div key={dimension} className="rounded-xl bg-slate-25 p-4 ring-1 ring-inset ring-slate-200">
              <h4 className="text-sm font-bold text-ink-900">{DIMENSION_LABELS[dimension]}</h4>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{DIMENSION_BLURBS[dimension]}</p>
              <div className="mt-3">
                <MetricBar value={evaluation[dimension].score} />
              </div>
            </div>
          ))}
        </div>

        <blockquote className="rounded-xl border-l-4 border-iris-500 bg-iris-50 px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-iris-700">Verdict</p>
          <p className="mt-1.5 text-sm leading-relaxed text-iris-900">{evaluation.verdict}</p>
        </blockquote>

        {!compact ? (
          <div className="space-y-4">
            {EVALUATION_DIMENSIONS.map((dimension) => (
              <div key={dimension}>
                <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  {DIMENSION_LABELS[dimension]} — how to improve
                </h4>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{evaluation[dimension].improvement}</p>
              </div>
            ))}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

export function TranscriptCard({ responses, currentKey }: { responses: readonly FounderResponse[]; currentKey: InvestorQuestionKey | null }) {
  return (
    <Card>
      <CardHeader title="Interview transcript" description="Every answer you have given, with the score it received." />
      <CardBody>
        {responses.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing answered yet. Your first question is on the left.</p>
        ) : (
          <ol className="space-y-4">
            {responses.map((response) => (
              <li key={response.id} className={cn('rounded-xl p-4 ring-1 ring-inset', currentKey === response.questionKey ? 'bg-brand-50 ring-brand-500/25' : 'bg-slate-25 ring-slate-200')}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h4 className="text-sm font-bold text-ink-900">{response.question}</h4>
                  <span className="text-xs font-bold tabular-nums text-slate-600">
                    {response.clarityScore} · {response.marketUnderstandingScore} · {response.financialReasoningScore}
                    <span className="ml-1 font-medium text-slate-400">/10 each</span>
                  </span>
                </div>

                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-700">{response.answer}</p>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">
                  <span className="font-semibold text-slate-600">Verdict:</span> {response.feedback.verdict}
                </p>
              </li>
            ))}
          </ol>
        )}
      </CardBody>
    </Card>
  );
}
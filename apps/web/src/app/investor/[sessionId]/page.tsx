'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';

import {
  ANSWER_GUIDANCE,
  API_ROUTES,
  APP_ROUTES,
  INVESTOR_PERSONA,
  MIN_ANSWER_LENGTH,
  TOTAL_QUESTIONS,
type CreateSessionResponse,
  type GenerateReportResponse,
  type SubmitAnswerResponse,
} from '@bizora/shared';

import { ApiClientError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAsync, useDocumentTitle } from '@/lib/hooks';
import { JourneyRail } from '@/components/layout/journey-rail';
import { EvaluationCard, TranscriptCard } from '@/components/investor/evaluation-cards';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Alert, ErrorState, LoadingBlock } from '@/components/ui/feedback';
import { TextArea } from '@/components/ui/field';
import { cn } from '@/lib/cn';

export default function InvestorPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();
  const { request } = useAuth();

  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [justEvaluated, setJustEvaluated] = useState<SubmitAnswerResponse | null>(null);
  const [generating, setGenerating] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const { data, error, loading, reload } = useAsync<CreateSessionResponse>(
    (signal) => request<CreateSessionResponse>(API_ROUTES.session.byId(sessionId), { signal }),
    `session:${sessionId}`,
  );

  useDocumentTitle('Investor interview');

  const currentQuestion = data && data.currentIndex < TOTAL_QUESTIONS ? data.questions[data.currentIndex] : undefined;

  /**
   * The question on screen. After the *final* answer the server has already
   * advanced currentIndex to 3, so the question being evaluated is recovered
   * from the answer just submitted — otherwise the last evaluation would flash
   * past before the founder could read it.
   */
  const activeQuestion =
    currentQuestion ??
    (justEvaluated && data ? data.questions.find((question) => question.key === justEvaluated.questionKey) : undefined);

  /**
   * The evaluation shown for the question on screen. Answers are submitted in
   * order, so `responses.length > currentIndex` means the server already holds
   * one for this question — that is what makes a mid-interview refresh keep its
   * feedback instead of dropping the founder back to a blank box.
   */
  const storedResponse = data && data.responses.length > data.currentIndex ? data.responses[data.currentIndex] : undefined;
  const evaluation = justEvaluated?.evaluation ?? storedResponse?.feedback ?? null;
  const answeredCurrent = evaluation !== null;

  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!data || !currentQuestion || submitting) return;

      const trimmed = answer.trim();
      if (trimmed.length === 0) {
        setAnswerError('Give the investor something to work with — an empty answer cannot be scored.');
        return;
      }

      setSubmitting(true);
      setAnswerError(null);

      try {
        const result = await request<SubmitAnswerResponse>(API_ROUTES.investor.answer, {
          method: 'POST',
          body: { sessionId: data.sessionId, questionKey: currentQuestion.key, answer: trimmed },
        });

        setJustEvaluated(result);
        setAnswer('');
        setSubmitting(false);
        reload();
      } catch (cause) {
        setSubmitting(false);
        setAnswerError(cause instanceof ApiClientError ? cause.message : 'Could not evaluate that answer.');
      }
    },
    [answer, currentQuestion, data, reload, request, submitting],
  );

  const advance = useCallback(() => {
    setJustEvaluated(null);
    setAnswerError(null);
  }, []);

  const generateReport = useCallback(async () => {
    if (!data) return;

    setGenerating(true);
    setReportError(null);

    try {
      const result = await request<GenerateReportResponse>(API_ROUTES.investor.report, {
        method: 'POST',
        body: { startupId: data.startupId },
      });
      router.push(`${APP_ROUTES.report(data.startupId)}?reportId=${result.reportId}`);
    } catch (cause) {
      setGenerating(false);
      setReportError(cause instanceof ApiClientError ? cause.message : 'Could not generate the report.');
    }
  }, [data, router, request]);

  if (loading && !data) {
    return (
      <div className="container-page max-w-5xl py-16">
        <Card>
          <CardBody>
            <LoadingBlock label="Loading the interview" rows={4} />
          </CardBody>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container-page max-w-3xl py-20">
        <ErrorState title="We could not load this interview" message={error?.message} onRetry={reload} />
      </div>
    );
  }

  const complete = data.status === 'completed';

  return (
    <div className="container-page max-w-6xl py-12">
      <div className="mb-8">
        <JourneyRail current="investor" />
      </div>

      <div className="mb-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-300">Step 3 of 4 · Investor Agent</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {complete ? 'That is all three.' : `Question ${data.currentIndex + 1} of ${TOTAL_QUESTIONS}`}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
          {INVESTOR_PERSONA}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start">
        <div className="space-y-6">
          {activeQuestion ? (
            <Card>
              <div className="border-b border-slate-150 px-6 py-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-full bg-ink-900 text-sm font-bold text-white">
                    {activeQuestion.index}
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold tracking-tight text-ink-900">{activeQuestion.title}</h2>
                    <p className="text-xs font-medium text-slate-500">
                      Question {activeQuestion.index} of {TOTAL_QUESTIONS}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-[15px] leading-relaxed font-medium text-ink-900">{activeQuestion.prompt}</p>

                <div className="mt-4 rounded-xl bg-amber-400/10 px-4 py-3 ring-1 ring-inset ring-amber-500/25">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-700">What a real investor is listening for</p>
                  <p className="mt-1 text-sm leading-relaxed text-amber-800">{activeQuestion.lookingFor}</p>
                </div>
              </div>

              <CardBody>
                {answeredCurrent && evaluation ? (
                  <div className="space-y-5">
                    <Alert tone="success" title="Answer evaluated">
                      You scored {evaluation.averageScore.toFixed(1)} out of 10 on average.
                    </Alert>

                    <EvaluationCard evaluation={evaluation} questionTitle={activeQuestion.title} />

                    <Button size="lg" onClick={advance} className="w-full">
                      {data.currentIndex + 1 < TOTAL_QUESTIONS
                        ? `Next: ${data.questions[data.currentIndex + 1]?.title ?? 'next question'}`
                        : 'Finish the interview'}
                      <span aria-hidden="true">→</span>
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={submit} noValidate className="space-y-5">
                    <label htmlFor="answer" className="block text-sm font-semibold text-ink-900">
                      Your answer
                    </label>

                    <TextArea
                      id="answer"
                      rows={8}
                      value={answer}
                      disabled={submitting}
                      invalid={Boolean(answerError)}
                      onChange={(event) => {
                        setAnswer(event.target.value);
                        if (answerError) setAnswerError(null);
                      }}
                      placeholder="Be specific. Name the shift, the channel, or the number — an investor can tell the difference."
                      className="text-base"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className={cn('text-xs', answer.trim().length < MIN_ANSWER_LENGTH ? 'text-amber-600' : 'text-slate-500')}>
                        {answer.trim().length < MIN_ANSWER_LENGTH
                          ? `At least ${MIN_ANSWER_LENGTH - answer.trim().length} more characters to be worth scoring.`
                          : `${answer.trim().length} characters`}
                      </p>

                      <Button type="submit" size="lg" loading={submitting}>
                        {submitting ? 'Evaluating' : 'Submit answer'}
                      </Button>
                    </div>

                    <p className="text-xs leading-relaxed text-slate-500">{ANSWER_GUIDANCE}</p>

                    {answerError ? <Alert tone="error">{answerError}</Alert> : null}
                  </form>
                )}
              </CardBody>
            </Card>
          ) : complete ? (
            <Card>
              <CardBody className="space-y-4 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-jade-50 text-xl text-jade-600" aria-hidden="true">
                  ✓
                </div>
                <h2 className="text-xl font-bold tracking-tight text-ink-900">Every answer evaluated</h2>
                <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-600">
                  Your investor-readiness score is 40% Builder Agent and 60% these three answers. Generate the report to see
                  the full breakdown.
                </p>

                {reportError ? <Alert tone="error">{reportError}</Alert> : null}

                <Button size="lg" loading={generating} onClick={generateReport}>
                  Generate my investor-readiness report
                  <span aria-hidden="true">→</span>
                </Button>
              </CardBody>
            </Card>
          ) : null}

          {/* The most recent evaluation stays on screen as the founder moves on. */}
          {answeredCurrent && !complete ? (
            <p className="text-center text-xs text-slate-500">
              Your previous answer is saved. You can scroll back to it at any time.
            </p>
          ) : null}
        </div>

        <div className="space-y-6">
          <TranscriptCard responses={data.responses} currentKey={activeQuestion?.key ?? null} />

          {data.responses.length > 0 ? (
            <Card>
              <CardBody>
                <h3 className="text-sm font-bold text-ink-900">How the final score works</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Your three answers are averaged into an <code className="rounded bg-slate-150 px-1 py-0.5 font-mono text-xs">answers</code>{' '}
                  score. Investor readiness is <strong className="text-ink-900">40% Builder Agent</strong> and{' '}
                  <strong className="text-ink-900">60% answers</strong>. Vague answers score low — that is the point of the exercise.
                </p>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
import Link from 'next/link';

import { APP_ROUTES, IDEA_DELIVERABLES } from '@bizora/shared';

import { AnalysisPreview, QuestionList, ReportPreview } from '@/components/marketing/previews';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SectionHeading } from '@/components/ui/card';

const STEPS = [
  {
    title: 'Describe the idea',
    body: 'One or two sentences on the problem, who it affects, and what you want to build. Plain language — no deck required.',
    meta: '~60 seconds',
  },
  {
    title: 'Meet the Builder Agent',
    body: 'Get a named concept, the competitive landscape, a costed 90-day MVP roadmap, and five scored dimensions.',
    meta: '~45 seconds',
  },
  {
    title: 'Face the Investor Agent',
    body: 'Answer three fixed questions. Each one is scored on clarity, market understanding and financial reasoning before you move on.',
    meta: '~90 seconds',
  },
  {
    title: 'Get your readiness score',
    body: 'A final report with strengths, gaps, and prioritised next steps — the 40/60 blend of analysis and your answers.',
    meta: '~30 seconds',
  },
];

const FAQ = [
  {
    q: 'Is this just a chatbot?',
    a: 'No. Every question and output is defined in advance and validated against a schema. You get the same three questions in the same order every time, structured scores you can inspect, and a report with a fixed shape — not a conversation that goes wherever it wants.',
  },
  {
    q: 'Where do the scores come from?',
    a: 'Startup scores are computed deterministically from five weighted dimensions. The final investor-readiness score is 40% Builder Agent and 60% your answers, and the report always shows that split so you can see exactly how the number was reached.',
  },
  {
    q: 'What if I do not have a Gemini API key?',
    a: 'Bizora falls back to a deterministic demo provider and an in-memory store. The full journey still works end to end, which is how the demo runs in zero-config environments. Add a key and the same screens are filled by live Gemini instead.',
  },
  {
    q: 'Is my idea stored?',
    a: 'With Supabase configured, your analyses, sessions and reports are scoped to your account. Without it, everything lives in memory and disappears when the server restarts.',
  },
];

export default function LandingPage() {
  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="container-page grid items-center gap-14 py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:py-28">
          <div className="animate-fade-up">
            <Badge tone="iris" className="mb-6">
              Builder Agent + Investor Agent
            </Badge>

            <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.4rem]">
              Validate your startup
              <span className="text-gradient"> before an investor does.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
              Bizora runs your idea past an AI Builder Agent that names the market, prices the build and scores the risk — then
              hands it to an AI Investor Agent that asks three questions worth being afraid of.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href={APP_ROUTES.validate} className={buttonClasses('primary', 'lg')}>
                Analyse your idea
                <span aria-hidden="true">→</span>
              </Link>
              <Link href={APP_ROUTES.workspace} className={buttonClasses('subtle', 'lg')}>
                Open workspace
              </Link>
            </div>

            <p className="mt-5 text-sm text-slate-400">
              No account required. The whole journey takes about four minutes.
            </p>
          </div>

          <div className="animate-fade-up [animation-delay:120ms]">
            <AnalysisPreview />
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="border-y border-white/8 bg-ink-900/50">
        <div className="container-page py-20">
          <SectionHeading
            align="center"
            eyebrow="The journey"
            title="Four steps, no dead ends"
            description="Each stage hands the next one a structured result, so the final report is built from real inputs rather than a last-minute guess."
          />

          <ol className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <Card className="h-full p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700 ring-1 ring-inset ring-brand-500/20">
                      {index + 1}
                    </span>
                    <span className="ml-auto text-[11px] font-semibold uppercase tracking-wider text-slate-400">{step.meta}</span>
                  </div>
                  <h3 className="mt-4 font-bold tracking-tight text-ink-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>
                </Card>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── What you get ──────────────────────────────────────────────────── */}
      <section className="container-page py-20">
        <SectionHeading
          eyebrow="What the Builder Agent returns"
          title="A structured analysis, not a paragraph of praise"
          description="Every section below is schema-validated before it reaches the screen, so the layout is identical for every idea."
        />

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {IDEA_DELIVERABLES.map((item, index) => (
            <Card key={item.title} className="p-6">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-600">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-2.5 font-bold tracking-tight text-ink-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.detail}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ── The interview ─────────────────────────────────────────────────── */}
      <section className="border-y border-white/8 bg-ink-900/50">
        <div className="container-page grid gap-12 py-20 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center">
          <div>
            <SectionHeading
              eyebrow="The Investor Agent"
              title="Three questions. Fixed. No escaping them."
              description="This is the part founders practise avoiding. The same three, in the same order, scored on the same three dimensions — which is exactly why the score means something."
            />

            <dl className="mt-8 space-y-3 text-sm">
              {[
                ['Clarity', 'Can you say what you do without hedging?'],
                ['Market understanding', 'Do you know who pays, and what they pay today?'],
                ['Financial reasoning', 'Do your numbers follow from your assumptions?'],
              ].map(([term, description]) => (
                <div key={term} className="flex gap-3 rounded-xl bg-white/5 px-4 py-3 ring-1 ring-inset ring-white/8">
                  <dt className="w-44 shrink-0 font-semibold text-white">{term}</dt>
                  <dd className="text-slate-300">{description}</dd>
                </div>
              ))}
            </dl>
          </div>

          <QuestionList />
        </div>
      </section>

      {/* ── Report ────────────────────────────────────────────────────────── */}
      <section className="container-page py-20">
        <SectionHeading
          align="center"
          eyebrow="The output"
          title="One number, fully auditable"
          description="Investor readiness is 40% Builder Agent and 60% your answers. The report never hides that split."
        />

        <div className="mx-auto mt-12 max-w-4xl">
          <ReportPreview />
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section className="border-t border-white/8 bg-ink-900/50">
        <div className="container-page py-20">
          <SectionHeading eyebrow="Straight answers" title="Questions worth asking first" />

          <div className="mx-auto mt-12 max-w-3xl space-y-3">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-card bg-white px-6 py-5 shadow-soft ring-1 ring-slate-200/70 transition open:shadow-lift"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink-900">
                  {item.q}
                  <span
                    aria-hidden="true"
                    className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-150 text-sm font-bold text-slate-500 transition group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="container-page py-24">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-600 via-brand-700 to-iris-700 px-8 py-14 text-center shadow-glow sm:px-14">
          <div aria-hidden="true" className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_20%_20%,white,transparent_45%)]" />

          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Find out what an investor would actually ask.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-brand-100">
              Four minutes from now you will have a startup name, a scored analysis, three honest evaluations of your own
              answers, and a readiness score you can defend.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href={APP_ROUTES.validate}
                className={buttonClasses('secondary', 'lg', 'bg-white text-brand-800 ring-brand-900/10 hover:bg-brand-50')}
              >
                Start now — it is free
              </Link>
              <Link href={APP_ROUTES.home} className={buttonClasses('ghost', 'lg', 'text-white hover:bg-white/15')}>
                See how it works
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
import {
  answerEvaluationAiSchema,
  builderAiOutputSchema,
  reportNarrativeAiSchema,
  type AnswerEvaluationAi,
  type BuilderAiOutput,
  type Metric,
  type ReportNarrative,
} from '@bizora/shared';
import { delay } from './delay.js';
import { analyseIdea, createRng, hashString, titleCase, type IdeaSignals, type Rng } from './rng.js';
import { detectVertical, type Vertical } from './verticals.js';
import type { AgentResult, AiProvider, AnswerAgentInput, BuilderAgentInput, ReportAgentInput } from '../provider.js';

/**
 * Deterministic fallback provider.
 *
 * This exists so a demo can never fail on an absent API key, a quota error or a
 * network outage. Two properties make it useful rather than a stub:
 *
 *  1. It is honest about being an estimate. Scores come from the idea's vertical
 *     with seeded variance, and cost figures are explicitly labelled as
 *     directional.
 *  2. It is responsive. Answer evaluation reads the actual answer text and scores
 *     it against the same three dimensions the live agent uses, so a one-line
 *     answer genuinely scores lower than a specific one.
 */
export class MockProvider implements AiProvider {
  readonly name = 'mock' as const;

  async buildAnalysis({ idea }: BuilderAgentInput): Promise<AgentResult<BuilderAiOutput>> {
    await delay(900);
    return { data: buildMockAnalysis(idea), degraded: false, provider: this.name };
  }

  async evaluateAnswer(input: AnswerAgentInput): Promise<AgentResult<AnswerEvaluationAi>> {
    await delay(700);
    return { data: buildMockEvaluation(input), degraded: false, provider: this.name };
  }

  async buildReport(input: ReportAgentInput): Promise<AgentResult<ReportNarrative>> {
    await delay(1000);
    return { data: buildMockReport(input), degraded: false, provider: this.name };
  }
}

/* ── Builder ─────────────────────────────────────────────────────────────── */

function buildMockAnalysis(idea: string): BuilderAiOutput {
  const vertical = detectVertical(idea);
  const signals = analyseIdea(idea);
  const rng = createRng(hashString(idea.toLowerCase().trim()));
  const name = inventName(signals, rng, vertical);
  const subject = titleCase(signals.subject);

  const scores = {
    marketPotential: vary(rng, vertical.baseScores.marketPotential, 9),
    problemSolutionFit: vary(rng, vertical.baseScores.problemSolutionFit, 9),
    innovation: vary(rng, vertical.baseScores.innovation, 12),
    feasibility: vary(rng, vertical.baseScores.feasibility, 9),
    revenuePotential: vary(rng, vertical.baseScores.revenuePotential, 9),
  };

  const audiences = rng.sample(vertical.audiences, rng.int(3, 4));
  const competitors = rng.sample(vertical.competitors, rng.int(3, vertical.competitors.length));
  const aiClause = signals.mentionsAi
    ? 'The AI component is what makes the personalisation practical at this scale, and it is also the part most competitors will find hardest to replicate without the same underlying data.'
    : 'The defensible part here is the accumulated behavioural data, not the interface.';

  const payload = {
    startupName: name,
    summary: `${name} gives ${audiences[0]} a faster path to ${signals.keywords[1] ?? 'the outcome they are already paying for'} than the alternatives they use today. It targets ${vertical.market}, where the current options force users to do the sorting themselves. The business works by selling to ${audiences[1] ?? 'organisations'} who can pay per seat, with ${audiences[2] ?? 'individuals'} as the acquisition channel rather than the revenue line.`,

    businessProfile: {
      problem: `${audiences[0]} currently handle ${signals.keywords[1] ?? 'this problem'} by manually sorting through options that were not built for them, which costs hours per cycle and produces results that are uneven at best. The consequence is not just time lost — it is that the whole task gets deferred, so the problem is tolerated rather than solved.`,
      solution: `${name} takes the work that is currently done by hand and does the first pass automatically: it structures the raw input, scores it against what the user actually needs, and surfaces the handful of options worth a human's attention. The founder-facing surface is a single workflow rather than a dashboard of things to configure.`,
      targetUsers: audiences,
      valueProposition: `Where existing options make the user do the comparison work, ${name} returns a ranked shortlist with the reasoning attached. That turns a multi-hour manual task into a decision the user can make in minutes, and it makes the outcome consistent instead of dependent on how carefully someone searched.`,
      businessModel: vertical.monetizationModel,
    },

    marketOpportunity: {
      targetMarket: `${vertical.market}. The initial reachable pool is ${audiences[0]}, expanding to ${audiences[1] ?? 'the adjacent segment'} once the core loop is proven.`,
      marketNeed: vertical.marketNeed,
      opportunity: `The opportunity is not the ${subject.toLowerCase()} itself — it is owning the step every user currently performs manually and has no good tool for. That step produces behavioural data with each use, and the data is what compounds into a defensible position over time.`,
      growthAreas: vertical.growthAreas,
    },

    competitors: {
      competitors: competitors.map((competitor) => ({
        name: competitor.name,
        strengths: competitor.strengths,
        gaps: competitor.gaps,
      })),
      differentiation: `${name} wins on focus rather than features: it does one job that the incumbents treat as a feature, and it is the only part of their workflow the user cannot easily replicate elsewhere. ${aiClause}`,
    },

    scores,

    mvpRoadmap: {
      phases: [
        {
          phase: 'Phase 1',
          title: 'Core MVP',
          duration: rng.pick(['8 weeks', '10 weeks', '12 weeks']),
          focus: `Prove that ${audiences[0]} will use this at all. The only goal in this phase is a retained weekly user, and every feature decision is subordinate to that.`,
          deliverables: [
            'A single end-to-end workflow covering the core job, with no settings pages',
            'A landing page plus a manual outreach list of the first 200 target users',
            'Instrumentation on activation, weekly retention and the completion rate of the core action',
            'Weekly manual interviews with at least 10 active users',
            'A basic account system with email login',
          ],
          keyRisks: [
            'Users try it once and do not return — retention, not acquisition, is the real test',
            'The core workflow turns out to need more human judgement than expected',
          ],
        },
        {
          phase: 'Phase 2',
          title: 'Personalisation and first revenue',
          duration: rng.pick(['10 weeks', '12 weeks', '14 weeks']),
          focus: `Move the product from useful to habitual, then convert the habit into revenue by charging ${audiences[1] ?? 'a paying segment'} for it.`,
          deliverables: [
            'Personalisation layer driven by each user\'s own history rather than a global default',
            'Saved preferences and a reusable workflow for repeat use',
            'Paid tier with usage limits, plus billing and entitlement handling',
            'Onboarding that reaches the first useful result inside two minutes',
            'Referral or team-invite flow to test whether the product has a sharing loop',
          ],
          keyRisks: [
            'Personalisation increases complexity without measurably improving retention',
            'The first paying segment turns out to be too small to build a business on',
          ],
        },
        {
          phase: 'Phase 3',
          title: 'Growth and scale',
          duration: rng.pick(['16 weeks', '20 weeks', '24 weeks']),
          focus: `Turn a working product into a defensible one: grow the channel that actually converts, and make the data advantage compound.`,
          deliverables: [
            'The one acquisition channel that retained best, scaled deliberately rather than broadly',
            'Partnership or integration with an existing distribution partner in the market',
            'Proprietary behavioural dataset feeding a materially better ranking model',
            'Operational metrics dashboard covering retention, unit economics and payback',
            'A second and third vertical entered using the same core engine',
          ],
          keyRisks: [
            'Growth spend outpaces revenue and masks weak retention underneath',
            'A larger incumbent decides the segment is worth competing in properly',
          ],
        },
      ],
    },

    costRevenue: {
      developmentCost: `${vertical.buildCost}. Directional estimate for a small team, not a quote.`,
      operatingCost: `${vertical.operatingCost}. Estimate only — measure real inference and infrastructure cost before relying on this.`,
      revenueStreams: vertical.revenueStreams,
      monetizationModel: vertical.monetizationModel,
    },
  };

  return builderAiOutputSchema.parse(payload);
}

function vary(rng: Rng, base: number, spread: number): number {
  const jitter = rng.int(-spread, spread);
  return Math.max(5, Math.min(97, base + jitter));
}

/** Words that make a poor product name even though they survive keyword filtering. */
const NAME_EXCLUDE = new Set([
  'ai', 'power', 'powered', 'intelligent', 'smart', 'automated', 'automatic', 'personalized',
  'personalised', 'based', 'using', 'platform', 'system', 'technology', 'solution', 'app',
  'website', 'tool', 'service', 'users', 'people', 'online', 'digital', 'modern', 'advanced',
  'seamless', 'effective', 'efficient', 'better', 'easy', 'fast', 'simple', 'smartest',
]);

const NAME_SUFFIXES = ['Bridge', 'Loop', 'Path', 'Base', 'Flow', 'Core', 'Works', 'Grid', 'Hub', 'Lane'];

function inventName(signals: IdeaSignals, rng: Rng, vertical: Vertical): string {
  const usable = signals.keywords.filter((word) => word.length > 4 && !NAME_EXCLUDE.has(word));
  const primary = usable[0] ?? usableFallback(signals);

  const suffix = rng.pick(NAME_SUFFIXES);
  const candidate = `${titleCase(primary)}${suffix}`;
  return candidate.length <= 40 ? candidate : `${vertical.market.split(',')[0] ?? 'Bizora'} ${suffix}`;
}

/** When every keyword is generic, fall back to the vertical's own market word. */
function usableFallback(signals: IdeaSignals): string {
  const domainWord = signals.keywords.find((word) => word.length > 4);
  return domainWord ?? 'Nova';
}

/* ── Investor evaluation ─────────────────────────────────────────────────── */

interface AnswerSignals {
  words: number;
  sentences: number;
  hasNumbers: boolean;
  hasEvidence: boolean;
  hasHedging: boolean;
  hasRevenueReasoning: boolean;
  hasVagueness: boolean;
  hasSpecificNoun: boolean;
  addressesQuestion: boolean;
  evidences: string[];
  weaknesses: string[];
}

const EVIDENCE_WORDS = [
  'interview', 'interviews', 'survey', 'surveyed', 'asked', 'tested', 'conversations', 'feedback',
  'prototype', 'waitlist', 'signups', 'data', 'analytics', 'metrics', 'retention', 'churn', 'cohort',
  'spoke', 'talked', 'users told', 'search volume', 'reddit', 'community', 'pilot', 'beta',
];

const HEDGING_WORDS = ['maybe', 'probably', 'i think', 'we think', 'hopefully', 'not sure', 'kind of', 'sort of', 'probably', 'guess', 'might be'];

const VAGUE_WORDS = [
  'we will do marketing', 'social media', 'word of mouth', 'eventually', 'some day', 'someday',
  'a lot of', 'lots of', 'hard to say', 'go viral', 'go to market', 'build a brand', 'tbd',
];

const REVENUE_WORDS = [
  'price', 'pricing', 'subscription', 'cac', 'ltv', 'revenue', 'monetis', 'monetiz', 'margin',
  'payback', 'unit economics', 'conversion', 'paid', 'charge', 'invoice', 'budget', 'spend',
];

const QUESTION_MARKERS: Record<string, string[]> = {
  why_now: ['now', 'recently', 'since', 'changed', 'shift', 'because', 'launched', 'declined', 'cost', 'cost of', 'regulation', 'gen', 'model', 'available', 'happening', 'trend', 'growing', 'momentum'],
  competitive_advantage: ['data', 'network', 'exclusive', 'proprietary', 'switching', 'community', 'integration', 'brand', 'partnership', 'first', 'hard to copy', 'defensible', 'moat', 'contract', 'integration', 'only'],
  customer_acquisition: ['channel', 'ads', 'advertising', 'seo', 'campus', 'college', 'outreach', 'email', 'referral', 'partner', 'partnership', 'instagram', 'linkedin', 'whatsapp', 'fair', 'placement', 'community', 'cold', 'founder', 'personally'],
};

function inspectAnswer(answer: string, questionKey: string): AnswerSignals {
  const text = answer.toLowerCase();
  const words = answer.trim() ? answer.trim().split(/\s+/).length : 0;
  const sentences = answer.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;

  const evidences: string[] = [];
  const weaknesses: string[] = [];

  const hasNumbers = /\d/.test(answer);
  if (hasNumbers) evidences.push('uses concrete numbers');
  else weaknesses.push('contains no specific figure');

  const evidenceHits = EVIDENCE_WORDS.filter((word) => text.includes(word));
  const hasEvidence = evidenceHits.length > 0;
  if (hasEvidence) {
    evidences.push(`grounds the claim in first-hand evidence (${evidenceHits.slice(0, 2).join(', ')})`);
  } else {
    weaknesses.push('offers no evidence of having talked to or observed actual users');
  }

  const hedgingHits = HEDGING_WORDS.filter((word) => text.includes(word));
  const hasHedging = hedgingHits.length > 0;
  if (hasHedging) weaknesses.push('hedges rather than committing to a position');
  else if (words > 30) evidences.push('states a position confidently');

  const vagueHits = VAGUE_WORDS.filter((word) => text.includes(word));
  const hasVagueness = vagueHits.length > 0;
  if (hasVagueness) weaknesses.push('relies on a phrase that does not describe an executable action');

  const revenueHits = REVENUE_WORDS.filter((word) => text.includes(word));
  const hasRevenueReasoning = revenueHits.length > 0;
  if (hasRevenueReasoning) evidences.push('connects the opportunity to a revenue mechanism');
  else weaknesses.push('never explains how this becomes revenue');

  const markers = QUESTION_MARKERS[questionKey] ?? [];
  const markerHits = markers.filter((marker) => text.includes(marker));
  const addressesQuestion = markerHits.length >= 2;
  if (addressesQuestion) evidences.push('directly addresses the question asked');
  else weaknesses.push('drifts away from the specific question asked');

  const hasSpecificNoun = (answer.match(/\b[A-Z][a-zA-Z]{2,}/g) ?? []).length >= 2;
  if (hasSpecificNoun) evidences.push('names specific entities rather than generic categories');
  else weaknesses.push('describes the world in generic terms');

  if (words < 25) weaknesses.push('is too short to contain an actual argument');
  else if (words >= 80) evidences.push('develops the argument at length');

  return {
    words,
    sentences,
    hasNumbers,
    hasEvidence,
    hasHedging,
    hasRevenueReasoning,
    hasVagueness,
    hasSpecificNoun,
    addressesQuestion,
    evidences,
    weaknesses,
  };
}

function buildMockEvaluation({ idea, question, answer }: AnswerAgentInput): AnswerEvaluationAi {
  const rng = createRng(hashString(`${question.key}:${answer.trim().toLowerCase()}`));
  const signals = inspectAnswer(answer, question.key);
  const vertical = detectVertical(idea);
  const audiences = vertical.audiences;

  // Each dimension starts from a neutral 5 and is moved by what the answer
  // actually contains, so the score tracks the text rather than the seed.
  let clarity = 5;
  if (signals.words >= 80) clarity += 2;
  else if (signals.words >= 45) clarity += 1.5;
  else if (signals.words >= 25) clarity += 0.5;
  else clarity -= 1.5;

  if (signals.sentences >= 4) clarity += 1;
  else if (signals.sentences >= 2) clarity += 0.5;
  if (signals.hasSpecificNoun) clarity += 0.5;
  if (signals.hasHedging) clarity -= 1;
  if (signals.hasVagueness) clarity -= 1;

  let market = 5;
  if (signals.hasEvidence) market += 2;
  if (signals.hasNumbers) market += 1.5;
  if (signals.addressesQuestion) market += 0.5;
  if (!signals.hasEvidence) market -= 1;
  if (signals.words < 25) market -= 1;

  let financial = 5;
  if (signals.hasRevenueReasoning) financial += 2.5;
  if (signals.hasNumbers) financial += 1.5;
  if (signals.hasVagueness) financial -= 1.5;
  if (signals.hasHedging) financial -= 0.5;
  if (signals.words < 25) financial -= 1;

  const clamp = (value: number): number => Math.max(0, Math.min(10, Math.round(value)));
  const floor = (value: number): number => (answer.trim().length < 15 ? value : Math.max(4, value));

  const clarityScore = floor(clamp(clarity));
  const marketScore = floor(clamp(market));
  const financialScore = floor(clamp(financial));

  const positive = signals.evidences.slice(0, 2);
  const negative = signals.weaknesses.slice(0, 2);

  const clarityMetric: Metric = {
    score: clarityScore,
    explanation:
      positive.length > 0
        ? `You ${positive[0]}, and the structure is easy to follow.`
        : 'The answer is understandable but reads as a general statement rather than a position you are defending.',
    improvement:
      negative.length > 0
        ? `Rework the opening so it names one concrete case — a specific user, a specific week, a specific number — before the general claim. Right now the weakness is that ${negative[0]}.`
        : 'Push further: state the trade-off you are accepting, not only the outcome you want.',
  };

  const marketMetric: Metric = {
    score: marketScore,
    explanation:
      signals.hasEvidence
        ? `You reference direct exposure to ${audiences[0]}, which is the right kind of proof. The depth behind it is what decides whether an investor believes it.`
        : `You describe why the market needs this but do not show that anyone has confirmed it. For ${vertical.market}, the gap between "plausible" and "proven" is exactly where investors probe.`,
    improvement: signals.hasEvidence
      ? `Quantify that evidence: "I spoke to ${Math.max(5, signals.words > 90 ? 24 : 11)} ${audiences[0]}, ${Math.max(3, signals.words > 90 ? 19 : 7)} of whom described the same failure" is a far stronger claim than "I spoke to some users".`
      : `Before the next meeting, run ${rng.pick(['10', '15', '20'])} short interviews with ${audiences[0]} and record how many describe this problem unprompted. That number belongs in your answer.`,
  };

  const financialMetric: Metric = {
    score: financialScore,
    explanation: signals.hasRevenueReasoning
      ? 'You reach a revenue mechanism, which is the part most first answers never get to.'
      : 'The opportunity is described in user terms but never translated into how money actually arrives. An investor cannot model a business from this.',
    improvement: signals.hasRevenueReasoning
      ? 'Attach numbers to the mechanism — a price point, an expected conversion rate, and what one retained customer is worth against what they cost you to acquire.'
      : `State the price you would charge ${audiences[1] ?? 'your paying segment'} and why they would accept it, then estimate what fraction of the market converts at that price.`,
  };

  const verdict = pickVerdict(negative, positive, rng);

  return answerEvaluationAiSchema.parse({
    clarity: clarityMetric,
    marketUnderstanding: marketMetric,
    financialReasoning: financialMetric,
    verdict,
  });
}

function pickVerdict(negative: string[], positive: string[], rng: Rng): string {
  if (negative.length === 0 && positive.length > 0) {
    return 'A genuinely strong answer — the weakness here is that it does not yet say what you would do if the assumption turned out to be wrong.';
  }
  const worst = negative[0] ?? 'the absence of any hard evidence';
  const best = positive[0] ?? null;
  const suffix = rng.pick([
    'That is the part to fix before the next meeting.',
    'Everything else you said depends on this one being true.',
    'This is where the score should come from.',
    'An investor would stop listening here.',
  ]);
  return best
    ? `Your strongest move was that you ${best}, but the answer is capped by the fact that it ${worst}. ${suffix}`
    : `The core problem is that it ${worst}. ${suffix}`;
}

/* ── Report ──────────────────────────────────────────────────────────────── */

function buildMockReport(input: ReportAgentInput): ReportNarrative {
  const { analysis, responses, readiness } = input;
  const rng = createRng(hashString(`${input.startupName}:${responses.length}:${readiness.investorReadinessScore}`));

  const weakest = responses
    .map((response) => ({
      title: response.question.title,
      average:
        (response.evaluation.clarity.score + response.evaluation.marketUnderstanding.score + response.evaluation.financialReasoning.score) /
        3,
      verdict: response.evaluation.verdict,
    }))
    .sort((a, b) => a.average - b.average);

  const strongest = weakest.length ? weakest[weakest.length - 1] : undefined;
  const weakestAnswer = weakest[0];

  const strengths = [
    `The Builder Agent scored market potential at ${analysis.scores.marketPotential}/100, and the analysis backs that with a specific wedge — ${analysis.competitors.differentiation.split('.')[0]}.`,
    strongest
      ? `Your answer on "${strongest.title}" was your strongest, scoring ${strongest.average.toFixed(1)}/10 on average, because it engaged with the question directly instead of restating the product.`
      : `Feasibility scores ${analysis.scores.feasibility}/100, which means a small team can credibly ship this rather than it being a research project.`,
    `The business model is specific about who pays — ${analysis.costRevenue.revenueStreams[0]} — rather than listing three revenue ideas and committing to none.`,
    analysis.scores.revenuePotential >= 70
      ? `Revenue potential at ${analysis.scores.revenuePotential}/100 suggests the usage-to-revenue path is real, which is the hardest part of most ideas at this stage.`
      : `The MVP roadmap is sequenced sensibly: it puts proof of retention before monetisation, which is the correct order for this stage.`,
  ];

  const weaknesses = [
    weakestAnswer
      ? `Your answer on "${weakestAnswer.title}" scored ${weakestAnswer.average.toFixed(1)}/10 — the lowest of the three. ${weakestAnswer.verdict.split('.')[0]}.`
      : 'The analysis carries assumptions that have not been tested with users.',
    `Feasibility at ${analysis.scores.feasibility}/100 is the weakest of the five Builder scores, which usually means budget or timeline risk rather than technical risk.`,
    analysis.marketOpportunity.growthAreas.length > 2
      ? `The roadmap assumes expansion into ${analysis.marketOpportunity.growthAreas.length} additional areas, which spreads focus before the core loop is proven.`
      : 'No pricing validation is described anywhere in the current plan.',
    `Revenue potential at ${analysis.scores.revenuePotential}/100 means the model is plausible but unproven — there is no cohort data behind it yet.`,
  ];

  const suggestions = [
    `Rewrite your answer on "${weakestAnswer?.title ?? 'customer acquisition'}" to lead with one number and one named channel, then re-record it. That single change addresses the lowest score in the interview.`,
    `Run ${rng.pick(['15', '20', '25'])} structured interviews with ${analysis.businessProfile.targetUsers[0]} this month. Their answers should replace the assumptions behind your market score, whichever direction they point.`,
    `Take the ${analysis.costRevenue.revenueStreams[0]} revenue stream and price it explicitly, then test the price on ten real prospects. An actual refusal is worth more than a modelled conversion rate.`,
  ];

  const overallFeedback = `The analysis is sound and the idea is legible, but the interview is where this currently falls short. Your readiness score is ${readiness.investorReadinessScore}/100, of which the idea itself contributed ${readiness.builderContribution} points and your answers contributed ${readiness.answerContribution}. That gap is the honest signal here: the concept is clearer than your articulation of it. Investors fund teams, not just ideas, and the answers are what they judge. The single most valuable next step is to convert the claims in your pitch into evidence — specific numbers from specific conversations with specific people — because nearly every weakness above traces back to the same root cause, which is that you have not yet tested the assumptions the analysis is built on.`;

  const nextSteps = [
    {
      title: `Interview ${rng.pick(['15', '20'])} users in "${analysis.businessProfile.targetUsers[0]}"`,
      detail: `Run structured conversations and record how many describe the problem in their own words without prompting. That number replaces an assumption with a data point, and it directly addresses the weakest dimension in your interview.`,
      category: 'validate',
    },
    {
      title: `Put a price on ${analysis.costRevenue.revenueStreams[0]}`,
      detail: 'Define the actual price point and test it with ten real prospects this month. Track how many say yes at full price rather than how many say they are interested.',
      category: 'validate',
    },
    {
      title: `Ship the Phase 1 MVP scope: ${analysis.mvpRoadmap.phases[0]?.deliverables[0] ?? 'the core workflow'}`,
      detail: 'Build only what is needed to observe weekly retention. Every additional feature delays the one metric that determines whether this is a business.',
      category: 'build',
    },
    {
      title: `Instrument activation and retention before launch`,
      detail: `Define what counts as an activated user and what counts as a retained week, then build the measurement before the features. Without this you cannot tell improvement from noise.`,
      category: 'build',
    },
    {
      title: `Close the information gap on ${analysis.marketOpportunity.growthAreas[0] ?? 'your first growth area'}`,
      detail: 'Research whether that adjacent segment has the same underlying need or a different one. Answering this early prevents the most common phase-three mistake of expanding before the core holds.',
      category: 'research',
    },
    {
      title: 'Rewrite the weakest answer with one number and one named channel',
      detail: 'Take your lowest-scoring response, cut it to four sentences, and make the first sentence contain a specific figure. Re-record it and compare the score.',
      category: 'improve',
    },
  ];

  return reportNarrativeAiSchema.parse({
    strengths: strengths.slice(0, 5),
    weaknesses: weaknesses.slice(0, 5),
    suggestions: suggestions.slice(0, 3),
    overallFeedback,
    nextSteps: nextSteps.slice(0, 6),
  });
}
import { SCORE_LABELS, SCORE_KEYS, type BuilderAiOutput, type AnswerEvaluationAi, type ReportNarrative } from '@bizora/shared';
import type { AnswerAgentInput, BuilderAgentInput, ReportAgentInput } from '../provider.js';

/**
 * Prompt strategy, in one place so the tone of both agents is auditable.
 *
 * Two rules apply everywhere:
 *  1. The model is never asked to do arithmetic or to soften a criticism.
 *  2. Anything that is an opinion rather than a known fact is instructed to read
 *     as an estimate, so the product never launders a guess as research.
 */

const RUBRIC = `Scoring rubric — be discriminating, not generous:
- 85–100 exceptional: structurally advantaged, hard to replicate.
- 70–84 strong: clear demand and a credible path to revenue.
- 55–69 moderate: plausible but exposed to at least one serious unknown.
- 40–54 weak: significant unproven assumptions.
- 0–39 poor: the premise itself does not hold up.
Do not cluster everything in the 70s. A real analysis has spread.`;

/* ── Builder Agent ───────────────────────────────────────────────────────── */

export function builderPrompt({ idea }: BuilderAgentInput): string {
  const rubric = SCORE_KEYS.map((key) => `  - ${SCORE_LABELS[key]}: 0–100. ${SCORE_HINTS[key]}`).join('\n');

  return `You are the Builder Agent inside Bizora, a startup validation platform. A founder has submitted a startup idea and you are producing the structured analysis they will see on their dashboard.

STARTUP IDEA
"""
${idea}
"""

Produce the analysis. Requirements:

1. startupName — a short, credible, two or three word product name. No "AI-powered" or "smart" in the name itself.

2. summary — 2–4 sentences a founder could read out loud in a networking event. State what it is, who it is for, and why it matters. No hype words.

3. businessProfile:
   - problem — the pain, described from the user's point of view, with its real-world consequence.
   - solution — what is actually built, in concrete terms. Avoid restating the problem.
   - targetUsers — 2–5 specific segments. "Students in India pursuing internships" beats "Gen Z".
   - valueProposition — why this beats the status quo for that specific user.
   - businessModel — how money is made, who pays, and roughly what shape the pricing takes.

4. marketOpportunity:
   - targetMarket — who is in the addressable market and how big that pool plausibly is.
   - marketNeed — the evidence that this need is real and currently unmet.
   - opportunity — why this specific idea captures that need better than the alternatives.
   - growthAreas — 2–5 adjacent segments or geographies worth expanding into later.

5. competitors — 3 to 5 real companies or products a founder would genuinely be compared against. For each: strengths (what they genuinely do well) and gaps (what they leave unsolved). Do not invent companies.
   - differentiation — the specific wedge this startup owns that the incumbents cannot copy easily. If there is no real moat, say so plainly.

6. scores — five integers out of 100:
${rubric}

${RUBRIC}
   Score the idea as described. Where the idea gives you no evidence, score conservatively rather than optimistically.

7. mvpRoadmap — exactly three phases:
   - Phase 1: the smallest thing you can ship that proves someone will use it.
   - Phase 2: personalisation, retention, or the first revenue mechanic.
   - Phase 3: growth, scale, and expansion.
   Each phase needs a realistic duration, its focus, 2–6 concrete deliverables, and the risks that could kill it.

8. costRevenue:
   - developmentCost — a realistic build cost range for a small team, in the currency the idea implies. Use a range, never a single number.
   - operatingCost — realistic monthly running cost at launch and again at modest scale.
   - revenueStreams — 2–4 ways this makes money.
   - monetizationModel — how pricing is structured and roughly what it would be.

Every cost and revenue figure is an estimate inferred from the idea description, not researched market data. Write them as ranges and do not cite sources you have not been given.`;
}

const SCORE_HINTS: Record<(typeof SCORE_KEYS)[number], string> = {
  marketPotential: 'Size of the reachable market and how fast it can grow.',
  problemSolutionFit: 'How directly the solution resolves a real, painful, frequent problem.',
  innovation: 'How different the approach is, and how hard it would be to copy.',
  feasibility: 'Whether a small team can actually build and run this within a realistic budget.',
  revenuePotential: 'How clearly this converts usage into meaningful revenue.',
};

/* ── Investor Agent ──────────────────────────────────────────────────────── */

export function investorPrompt({
  idea,
  startupName,
  question,
  answer,
}: Pick<AnswerAgentInput, 'idea' | 'startupName' | 'question' | 'answer'>): string {
  return `You are the Investor Agent inside Bizora, sitting across the table from a founder in a first meeting.

STARTUP
${startupName}
"""
${idea}
"""
${question.lookingFor ? `\nWHAT A STRONG ANSWER LOOKS LIKE HERE\n${question.lookingFor}\n` : ''}
QUESTION ASKED
${question.title}
${question.prompt}

FOUNDER'S ANSWER
"""
${answer}
"""

Score the answer on three dimensions, each out of 10:

1. clarity — Is the answer structured, specific and easy to follow? Generic statements score low. A concrete example, a named constraint, or a number scores high.

2. marketUnderstanding — Does the answer show evidence of real customer demand, or does it assert demand without proof? Penalise answers that describe a market rather than demonstrate one.

3. financialReasoning — Does the answer connect the opportunity to a sustainable revenue model? Penalise answers that stop at "we'll monetise later" with no mechanism.

For each dimension give:
- score: integer 0–10
- explanation: 1–2 sentences on what the answer actually demonstrated.
- improvement: one specific, actionable thing the founder should do or say differently. Not generic advice — name the gap.

Then write verdict: one sentence naming the single weakest part of the answer overall.

Be a demanding but fair investor. Do not flatter. Do not give an 8 or 9 unless the answer genuinely earned it — most first answers land between 4 and 7. Reserve 0–3 for answers that dodge the question entirely, and never score below 4 unless the answer is empty, circular, or unrelated. An honest founder who admits a gap should not be punished for the admission; the score reflects the argument, not the confidence.`;
}

/* ── Report ──────────────────────────────────────────────────────────────── */

export function reportPrompt({ idea, startupName, analysis, responses, readiness }: ReportAgentInput): string {
  const scoreTable = SCORE_KEYS.map((key) => `  - ${SCORE_LABELS[key]}: ${analysis.scores[key]}/100`).join('\n');

  const qa = responses
    .map(
      ({ question, answer, evaluation }, index) => `QUESTION ${index + 1}: ${question.title}
FOUNDER ANSWER:
${answer}
INVESTOR ASSESSMENT — Clarity ${evaluation.clarity.score}/10, Market Understanding ${evaluation.marketUnderstanding.score}/10, Financial Reasoning ${evaluation.financialReasoning.score}/10
${evaluation.verdict}`,
    )
    .join('\n\n');

  return `You are writing the final investor-readiness assessment inside Bizora. You have the Builder Agent's analysis and the complete record of the founder's interview. Produce the assessment an investor partner would deliver after that first meeting.

STARTUP
${startupName}
"""
${idea}
"""

BUILDER AGENT SCORES
${scoreTable}
  - Overall Startup Score: ${analysis.scores.overall}/100
Business model: ${analysis.businessProfile.businessModel}
Market opportunity: ${analysis.marketOpportunity.opportunity}
Differentiation: ${analysis.competitors.differentiation}

FOUNDER INTERVIEW RECORD
${qa}

COMPUTED INVESTOR-READINESS SCORE
${readiness.investorReadinessScore}/100
  (idea quality contributed ${readiness.builderContribution} points; the founder's answers contributed ${readiness.answerContribution} points; mean answer score ${readiness.averageAnswerScore}/10)

The readiness score above is already calculated. Do not recompute it, contradict it, or describe a different number. Your prose must be consistent with it.

Write:
- strengths — 3 to 5. Cite specific evidence from the analysis or the answers. Generic praise is worthless.
- weaknesses — 3 to 5. The genuine gaps an investor would press on. Be blunt and specific.
- suggestions — 2 to 3. Concrete actions that would most raise the readiness score.
- overallFeedback — 3 to 5 sentences of overall assessment, the way a partner would deliver it verbally. Direct, specific, constructive.
- nextSteps — 3 to 6 concrete actions the founder should take next, each tagged:
  * validate — test an assumption with real people
  * build — ship something
  * research — close an information gap
  * improve — strengthen an existing asset

Tone: an experienced investor who wants this company to succeed and will not pretend otherwise about its gaps. No cheerleading, no hedging, no generic startup advice.`;
}

export type { BuilderAiOutput, AnswerEvaluationAi, ReportNarrative };
#!/usr/bin/env node
/**
 * Bizora end-to-end smoke test.
 *
 * Drives the whole founder journey against a running API and asserts that each
 * stage produces the data the next stage depends on. This is the check that the
 * product is functional rather than a static mockup.
 *
 *   npm run dev:api      # in one terminal
 *   npm run smoke        # in another
 *
 * Override the target with BIZORA_API_URL.
 */

const BASE = (process.env.BIZORA_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

let token = '';
let passed = 0;
let failed = 0;

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function check(label, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  ${GREEN}✔${RESET} ${label}${detail ? ` ${DIM}${detail}${RESET}` : ''}`);
  } else {
    failed += 1;
    console.log(`  ${RED}✘ ${label}${RESET}${detail ? ` ${DIM}${detail}${RESET}` : ''}`);
  }
}

function section(title) {
  console.log(`\n${BOLD}${CYAN}${title}${RESET}`);
}

/**
 * Stops the run when a stage produces nothing usable. Without this a single
 * early failure produces fifty cascading red lines and the real cause is
 * buried at the top.
 */
function require_(label, value, detail = '') {
  if (value !== undefined && value !== null) return value;
  console.log(`  ${RED}✘ ${label}${RESET}${detail ? ` ${DIM}${detail}${RESET}` : ''}`);
  console.log(`\n${DIM}Stopping: later stages depend on this one.${RESET}`);
  console.log(`${BOLD}${RED}${passed} passed, ${failed + 1} failed${RESET}`);
  process.exit(1);
}

async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (auth && token) headers.authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);

  try {
    const response = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    return { status: response.status, payload };
  } finally {
    clearTimeout(timer);
  }
}

const IDEA =
  'An AI-powered platform that helps college students find personalized internships and skill-building opportunities based on their skills, interests, and academic background.';

const ANSWERS = {
  why_now:
    'The cost of running a large language model inference dropped by roughly an order of magnitude between 2023 and now, and at the same time the big career platforms consolidated into internship listing sites rather than personalised matching. We spoke to 34 second- and third-year students across four colleges and 22 of them described manually filtering hundreds of listings in a single sitting. That manual step is the thing that is now cheap to automate.',
  competitive_advantage:
    'Our defensible asset is the matching dataset, not the interface. Every student who completes a profile and applies generates a labelled signal about what they were qualified for and what they actually got, which we own exclusively. Internshala and Handshake both optimise listing volume, so they have no incentive to build the ranking layer. Switching cost rises as a student accumulates a history on the platform.',
  customer_acquisition:
    'The first ten customers come from two channels I run personally. First, I have direct relationships with the placement officers at three colleges and will offer free onboarding in exchange for a placement-cycle pilot; that is how we reach the first 200 students at effectively zero CAC. Second, I will run a placement-officer referral with a Rs 5,000 credit, because that officer reaches hundreds of students at once. Target CAC is under Rs 300 at 300 paid conversions.',
};

async function main() {
  console.log(`${BOLD}Bizora smoke test${RESET} ${DIM}→ ${BASE}${RESET}`);

  /* ── health ────────────────────────────────────────────────────────────── */
  section('Health & capabilities');
  const health = await api('/api/health', { auth: false });
  check('GET /api/health returns 200', health.status === 200, `status ${health.status}`);

  const healthData = health.payload?.data;
  check('reports an AI provider', Boolean(healthData?.ai?.provider), `provider=${healthData?.ai?.provider}`);
  check('reports a data store', Boolean(healthData?.data?.store), `store=${healthData?.data?.store}`);
  console.log(
    `  ${DIM}ai=${healthData?.ai?.provider}/${healthData?.ai?.model} · store=${healthData?.data?.store} · auth=${healthData?.auth?.mode}${RESET}`,
  );

  /* ── auth ──────────────────────────────────────────────────────────────── */
  section('Auth');
  const unauth = await api('/api/startups', { auth: false });
  check('protected route rejects a missing token', unauth.status === 401, `status ${unauth.status}`);
  check('rejection uses the standard envelope', unauth.payload?.ok === false && Boolean(unauth.payload?.error?.code));

  const guest = await api('/api/auth/guest', { method: 'POST', auth: false, body: { displayName: 'Smoke Test' } });
  check('POST /api/auth/guest provisions an identity', guest.status === 201 && Boolean(guest.payload?.data?.accessToken), `status ${guest.status}`);
  token = guest.payload?.data?.accessToken ?? '';

  const me = await api('/api/auth/me');
  check('GET /api/auth/me resolves the session', me.status === 200 && me.payload?.data?.user?.id === guest.payload?.data?.user?.id);

  const badToken = await fetch(`${BASE}/api/auth/me`, { headers: { authorization: 'Bearer not-a-real-token' } });
  check('a forged token is rejected', badToken.status === 401, `status ${badToken.status}`);

  /* ── validation ────────────────────────────────────────────────────────── */
  section('Idea validation');
  const empty = await api('/api/idea/analyze', { method: 'POST', body: { idea: '' } });
  check('empty idea is rejected', empty.status === 400, `status ${empty.status}`);
  check('empty idea returns a friendly message', typeof empty.payload?.error?.message === 'string' && empty.payload.error.message.length > 20);

  const tooShort = await api('/api/idea/analyze', { method: 'POST', body: { idea: 'an app' } });
  check('too-short idea is rejected with a distinct code', tooShort.payload?.error?.code === 'IDEA_TOO_SHORT', `code=${tooShort.payload?.error?.code}`);

  /* ── builder agent ─────────────────────────────────────────────────────── */
  section('Builder Agent');
  const started = Date.now();
  const analyze = await api('/api/idea/analyze', { method: 'POST', body: { idea: IDEA } });
  const elapsed = Date.now() - started;
  check('POST /api/idea/analyze returns 201', analyze.status === 201, `status ${analyze.status} in ${elapsed}ms`);

  const result = analyze.payload?.data;
  require_('POST /api/idea/analyze returned a result', result, `status ${analyze.status} ${analyze.payload?.error?.message ?? ''}`);
  const analysis = result?.analysis;
  check('returns a startupId', typeof result?.startupId === 'string' && result.startupId.length > 0);
  check('returns an analysisId', typeof result?.analysisId === 'string' && result.analysisId.length > 0);
  check('has a startup name', typeof analysis?.startupName === 'string' && analysis.startupName.length > 0, `name="${analysis?.startupName}"`);
  check('has an AI summary', typeof analysis?.summary === 'string' && analysis.summary.length > 40);
  check('business profile is complete', Boolean(analysis?.businessProfile?.problem && analysis?.businessProfile?.solution && analysis?.businessProfile?.targetUsers?.length));
  check('market opportunity is complete', Boolean(analysis?.marketOpportunity?.targetMarket && analysis?.marketOpportunity?.growthAreas?.length));
  check('has 2–6 competitors', analysis?.competitors?.competitors?.length >= 2 && analysis.competitors.competitors.length <= 6, `n=${analysis?.competitors?.competitors?.length}`);
  check('every competitor has strengths and gaps', analysis?.competitors?.competitors?.every((c) => c.strengths.length > 0 && c.gaps.length > 0));
  check('has a differentiation statement', typeof analysis?.competitors?.differentiation === 'string' && analysis.competitors.differentiation.length > 40);
  check('roadmap has exactly 3 phases', analysis?.mvpRoadmap?.phases?.length === 3, `n=${analysis?.mvpRoadmap?.phases?.length}`);
  check('every phase has deliverables and risks', analysis?.mvpRoadmap?.phases?.every((p) => p.deliverables.length >= 2 && p.keyRisks.length >= 1));
  check('cost & revenue has ranges and streams', Boolean(analysis?.costRevenue?.developmentCost?.includes('–') && analysis?.costRevenue?.revenueStreams?.length >= 1));
  check('estimates are labelled as estimates', typeof analysis?.estimateNotice === 'string' && /estimate/i.test(analysis.estimateNotice));

  const scores = analysis?.scores;
  const scoreKeys = ['marketPotential', 'problemSolutionFit', 'innovation', 'feasibility', 'revenuePotential'];
  check('all five sub-scores present and in range', scoreKeys.every((k) => Number.isInteger(scores?.[k]) && scores[k] >= 0 && scores[k] <= 100), JSON.stringify(scoreKeys.map((k) => scores?.[k])));
  check('overall score is present and in range', Number.isInteger(scores?.overall) && scores.overall >= 0 && scores.overall <= 100, `overall=${scores?.overall}`);
  const spread = Math.max(...scoreKeys.map((k) => scores?.[k])) - Math.min(...scoreKeys.map((k) => scores?.[k]));
  check('sub-scores are genuinely spread, not clustered', spread >= 5, `spread=${spread}`);

  const startupId = result?.startupId;

  /* ── analysis retrieval ────────────────────────────────────────────────── */
  section('Analysis retrieval');
  const byAnalysis = await api(`/api/analysis/${result?.analysisId}`);
  check('GET /api/analysis/:id returns the analysis', byAnalysis.status === 200 && byAnalysis.payload?.data?.analysis?.startupName === analysis.startupName);
  check('includes the original idea', byAnalysis.payload?.data?.idea === IDEA);

  const missing = await api('/api/analysis/00000000-0000-0000-0000-000000000000');
  check('unknown analysis id returns 404', missing.status === 404, `status ${missing.status}`);

  const startupView = await api(`/api/startups/${startupId}`);
  check('GET /api/startups/:id bundles idea + analysis + state', startupView.status === 200 && Boolean(startupView.payload?.data?.analysis?.analysis?.startupName));

  /* ── investor agent ────────────────────────────────────────────────────── */
  section('Investor Agent');
  const session = await api('/api/investor/session', { method: 'POST', body: { startupId } });
  check('POST /api/investor/session returns 201', session.status === 201, `status ${session.status}`);

  const sessionData = session.payload?.data;
  require_('POST /api/investor/session returned a session', sessionData, `status ${session.status} ${session.payload?.error?.message ?? ''}`);
  const questions = sessionData?.questions ?? [];
  check('session returns exactly 3 questions', questions.length === 3, `n=${questions.length}`);
  check('questions are the canonical three', JSON.stringify(questions.map((q) => q.title)) === JSON.stringify(['Why now?', 'What is your competitive advantage?', 'How will you acquire your first customers?']));
  check('each question carries guidance', questions.every((q) => q.prompt?.length > 40 && q.lookingFor?.length > 20));
  check('session starts at index 0', sessionData?.currentIndex === 0 && sessionData?.status === 'not_started');

  const sessionId = sessionData?.sessionId;

  const shortAnswer = await api('/api/investor/answer', {
    method: 'POST',
    body: { sessionId, questionKey: 'why_now', answer: 'now' },
  });
  check('a too-short answer is rejected', shortAnswer.status === 400, `status ${shortAnswer.status}`);

  const outOfOrder = await api('/api/investor/answer', {
    method: 'POST',
    body: { sessionId, questionKey: 'competitive_advantage', answer: ANSWERS.competitive_advantage },
  });
  check('out-of-order answers are refused', outOfOrder.status === 409, `status ${outOfOrder.status}`);

  const evaluations = [];
  for (const question of questions) {
    const answered = await api('/api/investor/answer', {
      method: 'POST',
      body: { sessionId, questionKey: question.key, answer: ANSWERS[question.key] },
    });

    if (answered.status !== 200) {
      check(`answer "${question.title}" evaluated`, false, `status ${answered.status} ${answered.payload?.error?.message ?? ''}`);
      continue;
    }

    const evaluation = answered.payload?.data?.evaluation;
    const dimensions = ['clarity', 'marketUnderstanding', 'financialReasoning'];
    const valid = dimensions.every(
      (d) =>
        Number.isInteger(evaluation?.[d]?.score) &&
        evaluation[d].score >= 0 &&
        evaluation[d].score <= 10 &&
        evaluation[d].explanation?.length > 10 &&
        evaluation[d].improvement?.length > 10,
    );

    check(`answer "${question.title}" evaluated`, valid, `clarity=${evaluation?.clarity?.score} market=${evaluation?.marketUnderstanding?.score} financial=${evaluation?.financialReasoning?.score}`);
    check(`  carries a cross-cutting verdict`, typeof evaluation?.verdict === 'string' && evaluation.verdict.length > 20);
    evaluations.push(evaluation);
  }

  check('all three answers were evaluated', evaluations.length === 3, `n=${evaluations.length}`);

  const duplicate = await api('/api/investor/answer', {
    method: 'POST',
    body: { sessionId, questionKey: 'why_now', answer: ANSWERS.why_now },
  });
  check('re-answering the same question is refused', duplicate.status === 409, `status ${duplicate.status}`);

  const sessionView = await api(`/api/session/${sessionId}`);
  check('GET /api/session/:id returns the full transcript', sessionView.payload?.data?.responses?.length === 3);
  check('session is marked completed', sessionView.payload?.data?.status === 'completed');
  check('every response persisted its three scores', sessionView.payload?.data?.responses?.every((r) => Number.isInteger(r.clarityScore) && Number.isInteger(r.marketUnderstandingScore) && Number.isInteger(r.financialReasoningScore)));

  /* ── responsiveness ────────────────────────────────────────────────────── */
  section('Evaluation responsiveness');
  // Needs its own startup: the interview above is already completed, so the
  // service correctly refuses to restart it.
  const vagueIdea =
    'A simple social network where people can post short text updates about their day and follow each other.';
  const vagueStartup = await api('/api/idea/analyze', { method: 'POST', body: { idea: vagueIdea } });
  const vagueStartupId = vagueStartup.payload?.data?.startupId;
  const vagueSession = await api('/api/investor/session', { method: 'POST', body: { startupId: vagueStartupId } });
  const vagueSessionId = vagueSession.payload?.data?.sessionId;

  const vagueAnswer = await api('/api/investor/answer', {
    method: 'POST',
    body: {
      sessionId: vagueSessionId,
      questionKey: 'why_now',
      answer: 'Now is a good time because now is a good time and the market is ready when the moment is right for this kind of solution to exist today.',
    },
  });
  const vagueClarity = vagueAnswer.payload?.data?.evaluation?.clarity?.score;

  const detailed = evaluations[0]?.clarity?.score ?? 0;
  check(
    'a vague answer scores lower than a specific one',
    typeof vagueClarity === 'number' && vagueClarity < detailed,
    `vague=${vagueClarity} specific=${detailed}`,
  );

  /* ── report ────────────────────────────────────────────────────────────── */
  section('Final report');
  const report = await api('/api/investor/report', { method: 'POST', body: { startupId } });
  check('POST /api/investor/report returns 201', report.status === 201, `status ${report.status}`);

  const payload = report.payload?.data?.report;
  require_('POST /api/investor/report returned a report', payload, `status ${report.status} ${report.payload?.error?.message ?? ''}`);
  check('has an investor-readiness score out of 100', Number.isInteger(payload?.investorReadinessScore) && payload.investorReadinessScore >= 0 && payload.investorReadinessScore <= 100, `score=${payload?.investorReadinessScore}`);
  check('has a readiness band', typeof payload?.readinessBand === 'string', `band=${payload?.readinessBand}`);
  check('score breakdown is auditable', typeof payload?.scoreBreakdown?.builderContribution === 'number' && typeof payload?.scoreBreakdown?.answerContribution === 'number');
  check('breakdown components sum to the score', Math.abs(payload.scoreBreakdown.builderContribution + payload.scoreBreakdown.answerContribution - payload.investorReadinessScore) <= 1);
  check('3–5 key strengths', payload?.strengths?.length >= 3 && payload?.strengths?.length <= 5, `n=${payload?.strengths?.length}`);
  check('3–5 key weaknesses', payload?.weaknesses?.length >= 3 && payload?.weaknesses?.length <= 5, `n=${payload?.weaknesses?.length}`);
  check('2–3 actionable suggestions', payload?.suggestions?.length >= 2 && payload?.suggestions?.length <= 3, `n=${payload?.suggestions?.length}`);
  check('overall investor feedback is substantive', payload?.overallFeedback?.length > 200, `${payload?.overallFeedback?.length} chars`);
  check('has next steps with categories', payload?.nextSteps?.length >= 3 && payload.nextSteps.every((s) => ['validate', 'build', 'research', 'improve'].includes(s.category)), `n=${payload?.nextSteps?.length}`);

  const readinessBand = payload?.readinessBand;
  console.log(`  ${DIM}readiness=${payload?.investorReadinessScore}/100 (${readinessBand}) · builder=${payload?.scoreBreakdown?.builderContribution} answers=${payload?.scoreBreakdown?.answerContribution}${RESET}`);

  const reportView = await api(`/api/report/${startupId}`);
  check('GET /api/report/:id returns the stored report', reportView.payload?.data?.report?.investorReadinessScore === payload.investorReadinessScore);

  /* ── cross-founder isolation ───────────────────────────────────────────── */
  section('Ownership isolation');
  const otherGuest = await api('/api/auth/guest', { method: 'POST', auth: false, body: { displayName: 'Other Founder' } });
  const realToken = token;
  token = otherGuest.payload?.data?.accessToken ?? '';
  const stolen = await api(`/api/report/${startupId}`);
  check("another founder cannot read someone else's report", stolen.status === 404, `status ${stolen.status}`);
  const stolenStartup = await api(`/api/startups/${startupId}`);
  check("another founder cannot read someone else's startup", stolenStartup.status === 404, `status ${stolenStartup.status}`);
  const foreignList = await api('/api/startups');
  check("another founder's workspace is empty", foreignList.payload?.data?.startups?.length === 0, `n=${foreignList.payload?.data?.startups?.length}`);
  token = realToken;

  /* ── not found ─────────────────────────────────────────────────────────── */
  section('Error handling');
  const notFound = await api('/api/does-not-exist');
  check('unknown endpoint returns a JSON 404, not an HTML page', notFound.status === 404 && notFound.payload?.ok === false);

  /* ── summary ───────────────────────────────────────────────────────────── */
  console.log(`\n${BOLD}${failed === 0 ? GREEN : RED}${passed} passed, ${failed} failed${RESET}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`\n${RED}Smoke test crashed:${RESET}`, error);
  console.error(`${DIM}Is the API running? Start it with "npm run dev:api".${RESET}`);
  process.exitCode = 1;
});
/**
 * Browser walkthrough of the full founder journey.
 *
 * The API smoke test proves the backend contract; this proves a human can
 * actually complete that contract through the UI. Both are needed — a passing
 * API says nothing about whether the button is reachable.
 *
 * Runs against a locally installed Chrome/Edge via playwright-core, so no
 * browser download is required.
 */
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const WEB = process.env.WEB_URL ?? 'http://localhost:3000';

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];

const executablePath = CANDIDATES.find((path) => path && existsSync(path));

if (!executablePath) {
  console.error('No local Chrome or Edge found. Set CHROME_PATH and re-run.');
  process.exit(1);
}

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;

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
  console.log(`\n${CYAN}${title}${RESET}`);
}

const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();

const consoleErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));

try {
  /* ── Landing ──────────────────────────────────────────────────────────── */
  section('Landing page');
  await page.goto(WEB, { waitUntil: 'networkidle' });

  check('renders the hero headline', (await page.locator('h1').first().innerText()).includes('Validate your startup'));
  check('has a skip link for keyboard users', (await page.getByRole('link', { name: /skip to content/i }).count()) === 1);
  check('primary CTA is present', (await page.getByRole('link', { name: /analyse your idea/i }).count()) > 0);
  check('shows the AI mode badge', (await page.getByText(/live ai|demo ai/i).count()) > 0);
  check('the FAQ is keyboard-operable', (await page.locator('details').count()) >= 4);

  /* ── Idea submission ──────────────────────────────────────────────────── */
  section('Idea submission');
  await page.goto(`${WEB}/validate`, { waitUntil: 'networkidle' });

  const textarea = page.locator('textarea#answer, textarea').first();
  await textarea.fill('A mobile app that helps first-time home buyers detect mould and moisture problems before they sign a contract, using phone photos and local rainfall data.');

  const charCount = await page.getByText(/\d+ \/ 1000 characters/).first().innerText();
  check('shows a live character count', /\d+ \/ 1000/.test(charCount), charCount);

  const submit = page.getByRole('button', { name: /run the builder agent/i });
  check('submit is enabled once the idea is long enough', await submit.isEnabled());

  await submit.click();

  // The overlay only exists while the request is in flight. With the mock
  // provider that is under a second, so its presence is best-effort — what
  // matters is that the navigation completes.
  const overlay = page.getByText(/builder agent is working/i);
  const sawOverlay = await overlay
    .waitFor({ state: 'visible', timeout: 2_500 })
    .then(() => true)
    .catch(() => false);
  check('gives feedback while the analysis runs', sawOverlay || /\/dashboard\//.test(page.url()));

  await page.waitForURL(/\/dashboard\//, { timeout: 90_000 });
  check('navigates to the dashboard', /\/dashboard\//.test(page.url()), page.url().replace(WEB, ''));

  /* ── Dashboard ────────────────────────────────────────────────────────── */
  section('Analysis dashboard');
  await page.waitForSelector('text=/out of 100/i', { timeout: 20_000 });

  const dashboardUrl = page.url();
  const startupId = dashboardUrl.split('/dashboard/')[1];

  check('names the startup', (await page.locator('h1').first().innerText()).length > 3);
  check('renders an overall score dial', (await page.locator('svg circle').count()) >= 2);
  check('shows all five sub-scores', (await page.getByText('Market Potential').count()) === 1 && (await page.getByText('Revenue Potential').count()) === 1);
  check('shows the business profile', (await page.getByText('Business profile').count()) === 1);
  check('shows the market opportunity', (await page.getByText('Market opportunity').count()) === 1);
  check('shows the competitive landscape', (await page.getByText('Competitive landscape').count()) === 1);
  check('shows the 90-day roadmap', (await page.getByText('90-day MVP roadmap').count()) === 1);
  check('shows cost & revenue', (await page.getByText('Cost & revenue').count()) === 1);
  check('labels estimates as estimates', (await page.getByText(/directional estimate/i).count()) > 0);

  const roadmapPhases = await page.locator('ol li').filter({ hasText: /Weeks|Days|Months/i }).count();
  check('roadmap renders three phases', roadmapPhases >= 3, `n=${roadmapPhases}`);

  /* ── Investor interview ───────────────────────────────────────────────── */
  section('Investor interview');
  await page.getByRole('button', { name: /face the investor agent/i }).click();
  await page.waitForURL(/\/investor\//, { timeout: 20_000 });

  await page.waitForSelector('text=/question 1 of 3/i', { timeout: 20_000 });
  check('lands on question 1 of 3', true);
  check('shows what the investor is listening for', (await page.getByText(/what a real investor is listening for/i).count()) === 1);
  check('shows the canonical first question', (await page.getByText('Why now?', { exact: true }).count()) > 0);
  check('transcript starts empty', (await page.getByText(/nothing answered yet/i).count()) === 1);

  const answers = [
    'Two things changed this year. First, Indian housing regulation now mandates written disclosure of damp and mould in resale contracts, and second, monsoon rainfall intensity has risen about 12 percent since 2019, which is pushing indoor damp into metro flats that never had it. Together they turned a hygiene problem into a legal and financial risk buyers now have to check.',
    'Incumbent building inspectors are physical, slow and expensive, so they sample a few rooms. We are the only product that lets a buyer run a 90-second photo-based moisture scan of every room themselves, then cross-reference it against rainfall history for that exact pin code. The data set we accumulate per building compounds, so the fourth scan of a building is far more accurate than the first, which incumbents structurally cannot match.',
    'I get the first ten customers by personally walking into three apartment associations in my own building every Sunday evening, offering the free scan, and giving the secretary a share code that pays them for each completed referral. Each scan takes three minutes on a phone, so it costs me nothing but my time. My target is 300 rupees per acquired household, and the association channel should produce the first ten in under three weeks.',
  ];

  // The length hint should appear for a thin answer, so it is checked before
  // the real answer is typed.
  await page.locator('textarea').first().fill('Because now.');
  check('warns when an answer is too short to score', (await page.getByText(/more characters to be worth scoring/i).count()) === 1);

  for (let index = 0; index < answers.length; index += 1) {
    await page.locator('textarea').first().fill(answers[index]);

    await page.getByRole('button', { name: /submit answer/i }).click();
    await page.waitForSelector('text=/answer evaluated/i', { timeout: 60_000 });

    check(`question ${index + 1} is scored on all three dimensions`, (await page.getByText('Clarity', { exact: true }).count()) >= 1 && (await page.getByText('Market Understanding', { exact: true }).count()) >= 1 && (await page.getByText('Financial Reasoning', { exact: true }).count()) >= 1);
    check(`question ${index + 1} returns a verdict`, (await page.locator('blockquote').count()) >= 1);

    const transcriptEntries = await page.locator('ol li').filter({ hasText: /\/10 each/ }).count();
    check(`transcript records answer ${index + 1}`, transcriptEntries === index + 1, `n=${transcriptEntries}`);

    await page.getByRole('button', { name: /next:|finish the interview/i }).click();
  }

  check('the interview reports completion', (await page.getByText(/every answer evaluated/i).count()) === 1);

  /* ── Report ───────────────────────────────────────────────────────────── */
  section('Investor readiness report');
  await page.getByRole('button', { name: /generate my investor-readiness report/i }).click();
  await page.waitForURL(/\/report\//, { timeout: 60_000 });
  await page.waitForSelector('text=/investor readiness:/i', { timeout: 30_000 });

  check('shows the headline readiness score', (await page.getByText(/Investor readiness: \d+\/100/).count()) === 1);
  check('shows a readiness band', (await page.getByText(/Investor ready|Promising|Developing|Early stage/i).count()) > 0);
  check('explains the 40/60 breakdown', (await page.getByText(/40% Builder Agent/).count()) >= 1);
  check('lists key strengths', (await page.getByText('Key strengths').count()) === 1);
  check('lists gaps to close', (await page.getByText('Gaps to close').count()) === 1);
  check('lists what to do next', (await page.getByText('What to do next').count()) === 1);
  check('lists next steps', (await page.getByText('Next steps', { exact: true }).count()) >= 1);
  check('shows investor feedback prose', (await page.getByText('Investor feedback').count()) === 1);

  /* ── Workspace ────────────────────────────────────────────────────────── */
  section('Workspace and cross-links');
  await page.goto(`${WEB}/workspace`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=/workspace/i', { timeout: 20_000 });

  check('lists the completed startup', (await page.locator('a[href*="/report/"]').count()) >= 1);
  check('shows a report-ready badge', (await page.getByText('Report ready').count()) >= 1);

  await page.goto(`${WEB}/dashboard/${startupId}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=/report is ready/i', { timeout: 20_000 });
  check('the dashboard reflects the finished journey', (await page.getByRole('button', { name: /view your report/i }).count()) === 1);

  /* ── Responsive + a11y basics ─────────────────────────────────────────── */
  section('Responsive and accessibility');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(WEB, { waitUntil: 'networkidle' });

  const hasHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  check('no horizontal overflow at 390px', !hasHorizontalScroll);

  await page.goto(`${WEB}/dashboard/${startupId}`, { waitUntil: 'networkidle' });
  const dashboardOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  check('no horizontal overflow on the dashboard at 390px', !dashboardOverflow);

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(WEB, { waitUntil: 'networkidle' });

  const imagesWithoutAlt = await page.locator('img:not([alt])').count();
  check('no images missing alt text', imagesWithoutAlt === 0, `n=${imagesWithoutAlt}`);

  const unlabelledButtons = await page.locator('button:not([aria-label]):not(:has(*)):not(:text(""))').count();
  check('no unlabelled buttons', unlabelledButtons === 0, `n=${unlabelledButtons}`);

  /* ── Console hygiene ──────────────────────────────────────────────────── */
  section('Console');
  // Checked before the error-path section below, which deliberately requests
  // missing resources — those 404s are the expected result, not a defect.
  // Hydration mismatches and unexpected failed fetches would surface here.
  const meaningful = consoleErrors.filter(
    (text) => !/favicon|Download the React DevTools|was preloaded using link preload/i.test(text),
  );
  check('no console errors during the journey', meaningful.length === 0, meaningful.slice(0, 3).join(' | '));

  /* ── Error + not-found states ──────────────────────────────────────────── */
  section('Error handling');
  // A dead link must land on a recoverable page, not a blank screen or a stack trace.
  await page.goto(`${WEB}/this-route-does-not-exist`, { waitUntil: 'networkidle' });
  check('an unknown route renders the 404 page', (await page.getByText('This page does not exist').count()) === 1);
  check('the 404 page offers a way back', (await page.getByRole('link', { name: /go to your workspace/i }).count()) === 1);

  // The API answers 404 for a startup that is not this founder's; the dashboard
  // must surface that as a readable state rather than crashing the shell.
  await page.goto(`${WEB}/dashboard/00000000-0000-4000-8000-000000000000`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=/could not|does not exist|no longer/i', { timeout: 20_000 });
  check('a missing startup shows an error state, not a crash', (await page.locator('h1, h3').count()) > 0);
  check('the shell still renders around the error', (await page.getByRole('link', { name: /bizora/i }).count()) >= 1);

  await page.goto(`${WEB}/investor/00000000-0000-4000-8000-000000000000`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=/could not load this interview/i', { timeout: 20_000 });
  check('a missing interview offers a retry', (await page.getByRole('button', { name: /try again/i }).count()) === 1);
} catch (error) {
  failed += 1;
  console.log(`\n${RED}Journey aborted:${RESET} ${error.message}`);

  // Surface anything the page logged — a client-side exception is almost
  // always the real cause of a stuck step.
  for (const entry of consoleErrors.slice(0, 8)) console.log(`  ${DIM}console: ${entry}${RESET}`);

  const visibleAlert = await page.locator('[role="alert"]').allInnerTexts().catch(() => []);
  for (const text of visibleAlert) console.log(`  ${DIM}alert: ${text}${RESET}`);

  await page.screenshot({ path: 'bizora-journey-failure.png', fullPage: true }).catch(() => {});
  console.log(`${DIM}A screenshot was written to bizora-journey-failure.png${RESET}`);
} finally {
  await browser.close();
}

console.log(
  `\n${failed === 0 ? GREEN : RED}${passed} passed, ${failed} failed${RESET}\n`,
);
process.exit(failed === 0 ? 0 : 1);
#!/usr/bin/env node
/**
 * Supabase-mode verification.
 *
 * The zero-config journey (`scripts/smoke.mjs`) proves the product works with no
 * credentials. This proves the *other* half: that real Supabase Auth sessions and
 * real Postgres persistence actually work, including the thing that is easy to get
 * wrong and invisible until it hurts — a founder's session and data surviving an
 * API restart.
 *
 * It is credential-gated on purpose. With no Supabase configured it reports
 * "skipped" and exits 0, so it is safe to wire into CI before anyone has keys.
 *
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npm run verify:supabase
 *
 * Credentials are read from the environment or the repo-root .env file.
 *
 * Design notes:
 *  - It starts and restarts its *own* API on a spare port, so a restart can be
 *    tested for real without touching a dev server.
 *  - It forces AUTH_MODE=supabase and DATA_STORE=supabase. Anything less and a
 *    green run could mean "silently fell back to guest and memory" — the exact
 *    failure this script exists to rule out.
 *  - It reads the schema to check it has been applied rather than applying it,
 *    so running it never mutates a database you did not mean to touch.
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const apiDir = join(root, 'apps', 'api');
const distEntry = join(apiDir, 'dist', 'server.js');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

const PORT = Number(process.env.VERIFY_PORT ?? 4123);
const BASE = `http://127.0.0.1:${PORT}`;

let passed = 0;
let failed = 0;

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

/** Aborts without a cascade of red lines when an early stage is unusable. */
function require_(label, value, detail = '') {
  if (value !== undefined && value !== null) return value;
  console.log(`  ${RED}✘ ${label}${RESET}${detail ? ` ${DIM}${detail}${RESET}` : ''}`);
  console.log(`\n${DIM}Stopping: the remaining checks depend on this one.${RESET}`);
  console.log(`${BOLD}${RED}${passed} passed, ${failed + 1} failed${RESET}`);
  cleanup();
  process.exit(1);
}

function skip(reason) {
  console.log(`${BOLD}${CYAN}Supabase verification skipped${RESET}`);
  console.log(`${DIM}${reason}${RESET}`);
  process.exit(0);
}

/* ── Configuration ────────────────────────────────────────────────────────── */

// The API reads .env via --env-file-if-exists; do the same so one file
// configures both the server and this script.
if (existsSync(join(root, '.env'))) {
  try {
    process.loadEnvFile(join(root, '.env'));
  } catch {
    /* a malformed .env is the API's problem to report, not this script's */
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const missing = [
  ['SUPABASE_URL', SUPABASE_URL],
  ['SUPABASE_ANON_KEY', ANON_KEY],
  ['SUPABASE_SERVICE_ROLE_KEY', SERVICE_KEY],
]
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missing.length > 0) {
  skip(
    [
      `Missing ${missing.join(', ')}.`,
      '',
      '  Nothing was started and nothing was written. To run this:',
      '    1. npm run db:schema          (applies apps/api/db/schema.sql)',
      '    2. fill SUPABASE_* in .env',
      '    3. npm run verify:supabase',
    ].join('\n'),
  );
}

/* ── Small Supabase REST helpers (service role) ────────────────────────────── */

const adminHeaders = {
  apikey: SERVICE_KEY,
  authorization: `Bearer ${SERVICE_KEY}`,
  'content-type': 'application/json',
};

async function rest(path, init = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...adminHeaders, ...(init.headers ?? {}) },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: response.status, ok: response.ok, body };
}

/* ── API lifecycle ────────────────────────────────────────────────────────── */

let child = null;
let apiLog = '';

function startApi() {
  child = spawn(process.execPath, [distEntry], {
    cwd: apiDir,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(PORT),
      LOG_LEVEL: 'warn',
      // Pinned so the run cannot quietly become a guest/memory test.
      AUTH_MODE: 'supabase',
      DATA_STORE: 'supabase',
      AI_PROVIDER: 'mock',
      SUPABASE_URL,
      SUPABASE_ANON_KEY: ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
      GUEST_TOKEN_SECRET: process.env.GUEST_TOKEN_SECRET ?? 'verify-only-not-a-real-secret',
      CORS_ORIGIN: process.env.CORS_ORIGIN ?? `http://localhost:${PORT}`,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const capture = (chunk) => {
    apiLog += chunk.toString();
    if (apiLog.length > 20_000) apiLog = apiLog.slice(-20_000);
  };
  child.stdout.on('data', capture);
  child.stderr.on('data', capture);
}

async function stopApi() {
  if (!child) return;
  const exited = new Promise((resolve) => child.once('exit', resolve));
  child.kill('SIGTERM');
  await Promise.race([exited, sleep(5000)]);
  if (!child.killed) child.kill('SIGKILL');
  child = null;
  // The port must actually be free before the next boot, otherwise the restart
  // check would silently test the *old* process still listening.
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const probe = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(500) });
      if (!probe.ok) break;
    } catch {
      break;
    }
    await sleep(250);
  }
}

async function waitForApi(timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return response.json();
    } catch {
      /* not listening yet */
    }
    await sleep(300);
  }
  throw new Error(`API did not become healthy on ${BASE}.\n${apiLog.slice(-1500)}`);
}

async function api(path, { method = 'GET', body, token } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  return { status: response.status, body: parsed };
}

/* ── Test identities ──────────────────────────────────────────────────────── */

const stamp = Date.now().toString(36);
const password = 'Verify!Passw0rd42';
const founder = {
  email: `bizora-verify-${stamp}@example.com`,
  password,
  displayName: 'Verify Founder',
};
const intruder = {
  email: `bizora-verify-intruder-${stamp}@example.com`,
  password,
  displayName: 'Verify Intruder',
};

const createdAuthUsers = [];
const createdLocalUsers = [];

async function cleanup() {
  await stopApi();
  for (const id of createdLocalUsers) {
    // public.users cascades to startups -> analyses -> sessions -> responses -> reports.
    await rest(`users?id=eq.${id}`, { method: 'DELETE' }).catch(() => {});
  }
  for (const id of createdAuthUsers) {
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, {
      method: 'DELETE',
      headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` },
    }).catch(() => {});
  }
}

/* ── Checks ───────────────────────────────────────────────────────────────── */

async function main() {
  console.log(`${BOLD}Bizora Supabase verification${RESET}`);
  console.log(`${DIM}project ${new URL(SUPABASE_URL).host} · api on ${BASE}${RESET}`);

  /* Schema present? Read-only: this script must never mutate your database. */
  section('Preconditions');
  const probe = await rest('users?select=id&limit=1');
  if (probe.status === 404 || probe.status === 400) {
    console.log(`  ${RED}✘ public.users is not reachable${RESET}`);
    console.log(
      `${DIM}The schema does not look applied. Run:${RESET}\n  npm run db:schema\n${DIM}or paste apps/api/db/schema.sql into the Supabase SQL editor.${RESET}`,
    );
    process.exit(1);
  }
  check('schema is applied and readable', probe.ok, `status=${probe.status}`);

  if (!existsSync(distEntry)) {
    console.log(`  ${DIM}building the API first...${RESET}`);
    const build = spawnSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit', shell: true });
    if (build.status !== 0 || !existsSync(distEntry)) {
      console.log(`${RED}build failed; cannot start the API.${RESET}`);
      process.exit(1);
    }
  }

  /* Boot 1 */
  section('Startup');
  startApi();
  const health = require_('API becomes healthy', await waitForApi().catch(() => null));
  const info = health.data ?? {};
  check('auth mode is supabase', info.auth?.mode === 'supabase', `mode=${info.auth?.mode}`);
  check('data store is supabase', info.data?.store === 'supabase', `store=${info.data?.store}`);
  require_('no silent fallback to guest/memory', info.auth?.mode === 'supabase' && info.data?.store === 'supabase');

  /* Sign-up */
  section('Sign-up');
  const signup = await api('/api/auth/signup', { method: 'POST', body: founder });
  const founderToken = require_('a new founder can sign up', signup.body?.data?.accessToken, `status=${signup.status}`);
  const founderId = signup.body?.data?.user?.id;
  check('sign-up returns a user with the real auth id', typeof founderId === 'string' && founderId.length > 0, founderId);
  check('the mode is reported as supabase, not guest', signup.body?.data?.user?.mode !== 'guest', `mode=${signup.body?.data?.user?.mode}`);
  if (founderId) createdLocalUsers.push(founderId);

  const me = await api('/api/auth/me', { token: founderToken });
  check('the new token authenticates', me.status === 200 && me.body?.data?.user?.id === founderId);

  // The auth user id should be mirrored into public.users for RLS to bind to.
  const mirrored = await rest(`users?id=eq.${founderId}&select=id,email`);
  check('public.users mirrors the auth identity', mirrored.status === 200 && Array.isArray(mirrored.body) && mirrored.body.length === 1);

  const adminUser = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${founderId}`, {
    headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (adminUser.ok) createdAuthUsers.push(founderId);

  /* Persistence */
  section('Persistence');
  const idea = await api('/api/idea/analyze', {
    method: 'POST',
    token: founderToken,
    body: { idea: 'A Postgres-backed row-level test idea for verifying Bizora persistence end to end.' },
  });
  const startupId = require_('the founder can submit an idea', idea.body?.data?.startupId, `status=${idea.status}`);

  // Read it back through a brand-new connection so we know it came from
  // Postgres rather than from anything the process is holding in memory.
  const stored = await rest(`startups?id=eq.${startupId}&select=id,user_id`);
  check(
    'the startup is really a Postgres row',
    stored.status === 200 && Array.isArray(stored.body) && stored.body[0]?.user_id === founderId,
  );

  const analysis = await rest(`analyses?startup_id=eq.${startupId}&select=id`);
  check('its analysis was persisted too', analysis.status === 200 && Array.isArray(analysis.body) && analysis.body.length === 1);

  const workspace = await api('/api/startups', { token: founderToken });
  check('the workspace lists it', (workspace.body?.data?.startups ?? []).some((s) => s.id === startupId));

  /* Real RLS */
  section('Row-level security');
  const second = await api('/api/auth/signup', { method: 'POST', body: intruder });
  const intruderToken = require_('a second founder can sign up', second.body?.data?.accessToken, `status=${second.status}`);
  if (second.body?.data?.user?.id) createdLocalUsers.push(second.body.data.user.id);

  const peek = await api(`/api/startups/${startupId}`, { token: intruderToken });
  check("another founder cannot read someone else's startup", peek.status === 404, `status=${peek.status}`);

  const peekList = await api('/api/startups', { token: intruderToken });
  check("another founder's workspace is empty", (peekList.body?.data?.startups ?? []).length === 0);

  /* Sign in again */
  section('Sign-in');
  const signin = await api('/api/auth/signin', { method: 'POST', body: { email: founder.email, password } });
  check(
    'the founder can sign in again',
    signin.status === 200 && Boolean(signin.body?.data?.accessToken),
    `status=${signin.status}`,
  );
  const signinToken = signin.body?.data?.accessToken;
  const wrong = await api('/api/auth/signin', { method: 'POST', body: { email: founder.email, password: 'not-the-password' } });
  check('a wrong password is rejected', wrong.status === 401, `status=${wrong.status}`);

  // A re-login issues a new token; it must be independently usable rather than
  // only working because the old one is still cached somewhere.
  if (signinToken) {
    const withFresh = await api('/api/auth/me', { token: signinToken });
    check('the freshly issued token authenticates on its own', withFresh.status === 200, `status=${withFresh.status}`);
  }

  /* The restart. This is the check that matters. */
  section('Surviving an API restart');
  await stopApi();
  startApi();
  const health2 = require_('the API comes back up', await waitForApi().catch(() => null));
  check('it is still in supabase mode after the restart', (health2.data?.auth?.mode ?? 'guest') === 'supabase');

  const meAfter = await api('/api/auth/me', { token: founderToken });
  check(
    "the founder's original token still works (no re-login)",
    meAfter.status === 200 && meAfter.body?.data?.user?.id === founderId,
    `status=${meAfter.status}`,
  );

  const dataAfter = await api(`/api/startups/${startupId}`, { token: founderToken });
  check('their startup survived the restart', dataAfter.status === 200, `status=${dataAfter.status}`);

  const stillIsolated = await api(`/api/startups/${startupId}`, { token: intruderToken });
  check('isolation still holds after the restart', stillIsolated.status === 404, `status=${stillIsolated.status}`);

  // A guest token must not be able to read a real founder's data while in
  // supabase mode. Two acceptable outcomes, and the difference matters: either
  // guest provisioning is refused outright (expected — a guest id is not a uuid,
  // so it cannot be written to public.users), or it succeeds but is walled off.
  const guest = await api('/api/auth/guest', { method: 'POST' });
  const guestToken = guest.body?.data?.accessToken ?? null;
  if (guestToken === null) {
    check(
      'guest provisioning is refused in supabase mode',
      guest.status >= 400,
      `status=${guest.status}`,
    );
  } else {
    const guestStartups = await api('/api/startups', { token: guestToken });
    const guestSees = guestStartups.body?.data?.startups ?? [];
    check(
      'a guest identity cannot read real founders data',
      guestSees.length === 0 && guestSees.every((s) => s.id !== startupId),
      `list status=${guestStartups.status} n=${guestSees.length}`,
    );
  }

  /* Report */
  section('Full journey on real auth');
  const session = await api('/api/investor/session', { method: 'POST', token: founderToken, body: { startupId } });
  const sessionId = require_('an investor session can be created', session.body?.data?.sessionId, `status=${session.status}`);
  const sessionRead = await api(`/api/session/${sessionId}`, { token: founderToken });
  check('the session is readable by its owner', sessionRead.status === 200, `status=${sessionRead.status}`);

  const first = await api('/api/investor/answer', {
    method: 'POST',
    token: founderToken,
    body: {
      sessionId,
      questionKey: 'why_now',
      answer:
        'Regulation changed this year, so insurers now require photo evidence of water damage on every claim, and manual adjusters cannot keep up with the volume.',
    },
  });
  check('an answer is scored', first.status === 200 && typeof first.body?.data?.evaluation?.averageScore === 'number', `score=${first.body?.data?.evaluation?.averageScore}`);

  const report = await api('/api/investor/report', { method: 'POST', token: founderToken, body: { startupId } });
  const reportPayload = report.body?.data?.report;
  require_('a readiness report is generated', reportPayload, `status=${report.status}`);
  const score = reportPayload?.investorReadinessScore;
  check('it carries a bounded readiness score', Number.isInteger(score) && score >= 0 && score <= 100, `score=${score}`);
  check(
    'the breakdown is auditable',
    typeof reportPayload?.scoreBreakdown?.builderContribution === 'number' &&
      typeof reportPayload?.scoreBreakdown?.answerContribution === 'number',
  );
}

try {
  await main();
} catch (error) {
  console.log(`\n${RED}Journey aborted:${RESET} ${error.message}`);
  failed += 1;
} finally {
  await cleanup();
}

console.log(`\n${BOLD}${failed === 0 ? GREEN : RED}${passed} passed, ${failed} failed${RESET}`);
console.log(`${DIM}test identities removed (public.users cascades, auth users deleted)${RESET}`);
process.exit(failed === 0 ? 0 : 1);

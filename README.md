# Bizora

**From a startup idea to investor-ready, in one sitting.**

A founder submits an idea, gets a structured Builder Agent analysis, answers three
questions the way an investor would ask them, and leaves with a readiness score,
an honest verdict, and a concrete list of what to fix next.

Bizora runs with **zero configuration**. Clone it, install, run — no API keys, no
database, no signup wall. Add credentials when you want them and the same code
upgrades itself to Gemini and Postgres.

```bash
npm install
npm run dev          # http://localhost:3000
```

---

## What it does

| Stage | What happens |
| --- | --- |
| **Idea** | The founder describes the startup. Inline validation, then a ~1s structured analysis. |
| **Builder Agent** | Business profile, market opportunity, 3–5 real competitors with the differentiator, five 0–100 sub-scores, a 3-phase MVP roadmap, and labelled cost/revenue estimates. |
| **Investor Agent** | The same three canonical questions a real investor asks, each scored on clarity, market understanding and financial reasoning. |
| **Readiness report** | `40%` Builder + `60%` answers, a band, strengths, gaps, next steps with categories, and investor feedback prose. |

Vague answers score low **on purpose**. That is the product, not a bug — the
founder needs the gap named honestly.

---

## Zero config, on purpose

Every external dependency is optional and has a deterministic fallback. `GET /api/health`
reports which mode is live, and the UI surfaces it in the header.

| Add this | You get | Without it |
| --- | --- | --- |
| `GEMINI_API_KEY` | Gemini 3.8 Flash, real analysis and evaluation | Deterministic mock provider — same input, same output |
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Postgres persistence across restarts and devices | In-process store; data resets when the API restarts |
| Supabase Auth config | Real email/password accounts | Guest founder identity, auto-provisioned |

Force a mode with `AI_PROVIDER`, `DATA_STORE` and `AUTH_MODE` (`auto` | explicit).
In `gemini` mode a missing key or a failed call fails loudly instead of silently
degrading — so a misconfigured deployment is obvious rather than mysteriously wrong.

Copy `.env.example` to `.env` to change any of it. See `apps/web/.env.example` for
the two frontend variables.

To switch on Postgres, apply the schema once and restart:

```bash
npm run db:schema          # or paste apps/api/db/schema.sql into the SQL editor
```

The schema is idempotent (`create table if not exists`) and enables row-level
security, so it is safe to re-run.

---

## Scripts

Run everything from the repository root.

| Command | What it does |
| --- | --- |
| `npm run dev` | API on `:4000` and web on `:3000` together |
| `npm run dev:api` / `npm run dev:web` | One side only |
| `npm run typecheck` | `tsc --noEmit` across shared, api, web |
| `npm run lint` | ESLint across all three workspaces |
| `npm test` | Scoring and contract unit tests |
| `npm run build` | Shared → API → Next production build |
| `npm run smoke` | Full backend journey against a running API (66 checks) |
| `npm run verify:supabase` | Real Supabase Auth + Postgres journey (25 checks; skips cleanly without credentials) |
| `npm run db:schema` | Apply `apps/api/db/schema.sql` to Postgres (needs `SUPABASE_DB_URL` + `psql`) |
| `npm start` | Run the compiled API |

`@bizora/shared` is built automatically before `dev`, `build`, `typecheck` and
`test`, because every workspace imports its compiled output.

---

## Layout

```
apps/
  api/        Express 5 + Zod + TypeScript
    src/ai/       provider chain: gemini -> mock, plus prompts and rubrics
    src/data/     DataStore interface, memory and Supabase implementations
    src/services/ builder, investor, report, auth — all the business rules
    src/routes/   thin HTTP layer; validation happens in middleware
    db/schema.sql tables, RLS policies and indexes
  web/        Next.js 16 App Router, React 19, Tailwind v4
    src/app/      one folder per route
    src/components/  ui primitives, layout, analysis, investor, marketing
    src/lib/      typed API client, auth context, hooks
packages/
  shared/     Zod contracts, scoring maths, route constants, demo content
scripts/
  smoke.mjs           backend end-to-end journey
  browser-journey.mjs real browser founder journey (Playwright)
```

Both stores implement one `DataStore` interface, so switching to Postgres changes
no service code. Routes stay thin: validate, delegate to a service, serialise.
Business rules live in `src/services` and are covered by the smoke test.

---

## Testing

- `npm test` — scoring maths: bounds, band thresholds, weight sums, empty answers.
- `npm run smoke` — 66 checks over the real HTTP surface, including **ownership
  isolation** (founder B cannot read founder A's startup or report) and error shape.
- `node scripts/browser-journey.mjs` — 55 checks in a real browser: idea → analysis →
  three answers → report, then responsive overflow at 390px, missing `alt` text,
  unlabelled buttons, console errors, and the error/not-found paths (unknown route,
  another founder's startup, a missing interview).

The browser journey needs the dev servers running and a local Chrome or Edge.

### Verifying Supabase

`npm run smoke` proves the zero-config path. The other path — real accounts, real
Postgres — is verified separately:

```bash
npm run db:schema        # once
npm run verify:supabase
```

It starts and restarts its own API on port `4123`, so it never disturbs your dev
server. It forces `AUTH_MODE=supabase` and `DATA_STORE=supabase`, because a green
run that silently fell back to guest and memory would be worse than no run at all.
It also **restarts the API mid-run and reuses the original token**, which is the
check that catches the failure mode where data or identity quietly evaporates.

Without credentials it prints `skipped` and exits `0`, so it is safe in CI. Test
identities are deleted afterwards; `public.users` cascades to everything below it.

---

## Deploying

**API → Railway / Render / Fly.** Build `npm run build --workspace @bizora/api`,
start `npm run start --workspace @bizora/api`. Set `PORT`, `CORS_ORIGIN` to the
web origin, and a real `GUEST_TOKEN_SECRET` — the default is a published dev value.

**Web → Vercel.** Build `npm run build --workspace @bizora/web`, set
`NEXT_PUBLIC_API_URL` to the deployed API and `NEXT_PUBLIC_SITE_URL` to the web
origin. Both are inlined at build time, so set them before building.

Without `SUPABASE_*`, note that the in-memory store is per-instance: data does not
survive a restart and is not shared between replicas. That is fine for a demo and
wrong for production — configure Postgres first.

---

## Notes on the design

**Guest tokens are stateless.** A guest identity is an HMAC-signed token, so
restarting the API does not sign anyone out and no session row is needed. Tokens
expire after 30 days; in Supabase mode the same interface verifies real Supabase
tokens instead.

**The client never provisions a guest mid-session.** Auth hydration completes
before any page fetches, so a refresh cannot silently swap your identity and
orphan your startups. Requests are also deduplicated per resource — one page load
fires one request.

**The last answer still gets read.** After the third answer the interview shows
that answer's evaluation before offering the report, rather than skipping past it.

**Scores are auditable.** Every breakdown in the UI sums back to the headline
number, and the smoke test asserts it.
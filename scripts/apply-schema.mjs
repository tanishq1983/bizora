/**
 * Applies apps/api/db/schema.sql to a Postgres database.
 *
 * Exists so the documented setup step is one command instead of a psql incantation
 * the reader has to reconstruct. It deliberately does not bundle a Postgres
 * driver: adding `pg` as a dependency would mean shipping a database client in
 * the install for people who never touch the database, and psql is already a
 * hard requirement for applying a schema by hand.
 *
 *   SUPABASE_DB_URL=postgres://... npm run db:schema
 *
 * Alternatively paste the file into the Supabase SQL editor, which needs nothing
 * installed at all.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const schemaPath = join(root, 'apps', 'api', 'db', 'schema.sql');

const RED = '\u001b[31m';
const DIM = '\u001b[2m';
const RESET = '\u001b[0m';

function fail(message) {
  console.error(`${RED}${message}${RESET}`);
  process.exit(1);
}

if (!existsSync(schemaPath)) fail(`schema not found at ${schemaPath}`);

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  fail(
    [
      'SUPABASE_DB_URL is not set.',
      '',
      '  Supabase: Settings -> Database -> Connection string (URI), then',
      `    $env:SUPABASE_DB_URL = 'postgres://...'; npm run db:schema${RESET}`,
      '',
      `  ${DIM}or paste apps/api/db/schema.sql into the Supabase SQL editor.${RESET}`,
    ].join('\n'),
  );
}

const probe = spawnSync('psql', ['--version'], { encoding: 'utf8', shell: process.platform === 'win32' });
if (probe.error || probe.status !== 0) {
  fail(
    [
      'psql was not found on PATH, so the schema cannot be applied automatically.',
      '',
      `  ${DIM}Install the PostgreSQL client tools, or paste${RESET}`,
      `  ${DIM}apps/api/db/schema.sql into the Supabase SQL editor.${RESET}`,
    ].join('\n'),
  );
}

console.log(`${DIM}applying apps/api/db/schema.sql${RESET}`);

const applied = spawnSync('psql', [url, '-v', 'ON_ERROR_STOP=1', '-f', schemaPath], {
  stdio: 'inherit',
  // The URL can carry a password, so keep it out of the printed command.
  shell: false,
});

if (applied.status !== 0) {
  console.error(`${RED}schema did not apply cleanly (psql exited ${applied.status ?? 'with a signal'}).${RESET}`);
  process.exit(applied.status ?? 1);
}

console.log('schema applied.');

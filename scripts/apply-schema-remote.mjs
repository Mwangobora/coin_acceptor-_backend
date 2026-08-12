import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const schemaFile = 'charging_system_source_of_truth.sql';
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error(
    'DATABASE_URL is required, e.g.\n' +
      '  DATABASE_URL="postgresql://user:pass@host:5432/db?schema=charging_system" npm run db:schema:apply:remote',
  );
  process.exit(1);
}

const hasLocalPsql = spawnSync('psql', ['--version']).status === 0;

function psql(args, input) {
  const result = hasLocalPsql
    ? spawnSync('psql', [databaseUrl, ...args], { encoding: 'utf8', input })
    : spawnSync(
        'docker',
        ['run', '--rm', '-i', 'postgres:16-alpine', 'psql', databaseUrl, ...args],
        { encoding: 'utf8', input },
      );

  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }

  return result.stdout.trim();
}

if (!hasLocalPsql) {
  console.log('Local psql not found; running it via `docker run postgres:16-alpine` instead.');
}

const tableCount = Number(
  psql([
    '-tAc',
    "select count(*) from information_schema.tables where table_schema='charging_system';",
  ]),
);

if (tableCount > 0) {
  console.log(
    `Schema already has ${tableCount} table(s); refusing to reapply source SQL.`,
  );
  console.log(
    'Connect with psql and drop the schema first if you intentionally want to reapply it.',
  );
  process.exit(0);
}

psql(['-v', 'ON_ERROR_STOP=1'], readFileSync(schemaFile, 'utf8'));
console.log(`Applied ${schemaFile} to the database at the given DATABASE_URL.`);

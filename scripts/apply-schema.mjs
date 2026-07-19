import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const user = process.env.POSTGRES_USER ?? 'postgres';
const database = process.env.POSTGRES_DB ?? 'charging_system';
const schemaFile = 'charging_system_source_of_truth.sql';

function psql(args, input) {
  const result = spawnSync(
    'docker',
    ['compose', 'exec', '-T', 'database', 'psql', '-U', user, '-d', database, ...args],
    { encoding: 'utf8', input },
  );

  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }

  return result.stdout.trim();
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
  console.log('Use db:reset only when you intentionally want to delete dev data.');
  process.exit(0);
}

psql(['-v', 'ON_ERROR_STOP=1'], readFileSync(schemaFile, 'utf8'));
console.log(`Applied ${schemaFile} to database ${database}.`);

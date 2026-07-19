import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const user = process.env.POSTGRES_USER ?? 'postgres';
const database = process.env.POSTGRES_TEST_DB ?? 'charging_system_test';
const sourceSql = readFileSync('charging_system_source_of_truth.sql', 'utf8');

function psql(targetDatabase, args, input) {
  const result = spawnSync(
    'docker',
    [
      'compose',
      'exec',
      '-T',
      'database',
      'psql',
      '-U',
      user,
      '-d',
      targetDatabase,
      ...args,
    ],
    { encoding: 'utf8', input },
  );

  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
}

psql('postgres', [
  '-v',
  'ON_ERROR_STOP=1',
  '-c',
  `select pg_terminate_backend(pid) from pg_stat_activity where datname='${database}';`,
  '-c',
  `drop database if exists ${database};`,
  '-c',
  `create database ${database};`,
]);
psql(database, ['-v', 'ON_ERROR_STOP=1'], sourceSql);
console.log(`Reset dedicated test database: ${database}`);

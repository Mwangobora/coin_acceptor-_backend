import { spawnSync } from 'node:child_process';

const user = process.env.POSTGRES_USER ?? 'postgres';
const database = process.env.POSTGRES_DB ?? 'charging_system';
const expectedTables = [
  'users',
  'roles',
  'permissions',
  'stations',
  'role_permissions',
  'user_role_assignments',
  'auth_sessions',
  'devices',
  'device_credentials',
  'lockers',
  'charging_ports',
  'device_events',
  'device_telemetry',
  'device_commands',
  'charging_packages',
  'payments',
  'coin_insertions',
  'qr_payment_transactions',
  'charging_sessions',
  'charging_session_payments',
  'alerts',
  'system_settings',
  'audit_logs',
];

function query(sql) {
  const result = spawnSync(
    'docker',
    ['compose', 'exec', '-T', 'database', 'psql', '-U', user, '-d', database, '-tAc', sql],
    { encoding: 'utf8' },
  );

  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }

  return result.stdout.trim();
}

const tableSql = expectedTables.map((table) => `'${table}'`).join(',');
const existingTables = query(`
  select table_name from information_schema.tables
  where table_schema='charging_system' and table_name in (${tableSql});
`).split('\n').filter(Boolean);
const missingTables = expectedTables.filter((table) => !existingTables.includes(table));
const extensionCount = Number(query(`
  select count(*) from pg_extension where extname in ('pgcrypto','citext');
`));
const schemaExists = query(`
  select exists(select 1 from information_schema.schemata
  where schema_name='charging_system');
`) === 't';
const triggerCount = Number(query(`
  select count(*) from information_schema.triggers
  where trigger_schema='charging_system';
`));
const databaseName = query('select current_database();');

if (missingTables.length > 0) {
  console.error(`Missing tables: ${missingTables.join(', ')}`);
  process.exit(1);
}
if (!schemaExists || extensionCount !== 2 || triggerCount === 0) {
  console.error('Database schema, extensions, or triggers are not ready.');
  process.exit(1);
}
if (databaseName !== database) {
  console.error(`Connected to ${databaseName}, expected ${database}.`);
  process.exit(1);
}

console.log(`Verified ${existingTables.length} charging_system tables.`);
console.log(`Extensions installed: pgcrypto, citext. Triggers found: ${triggerCount}.`);

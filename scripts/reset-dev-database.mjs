import { spawnSync } from 'node:child_process';

const required = 'delete-development-data';

if (process.env.CONFIRM_DB_RESET !== required) {
  console.error('Refusing to delete the development database volume.');
  console.error(`Re-run with CONFIRM_DB_RESET=${required} npm run db:reset`);
  process.exit(1);
}

console.warn('Deleting Docker PostgreSQL development data volume now.');

const result = spawnSync('docker', ['compose', 'down', '-v'], {
  encoding: 'utf8',
  stdio: 'inherit',
});

process.exit(result.status ?? 1);

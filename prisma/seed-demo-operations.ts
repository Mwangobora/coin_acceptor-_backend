import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

import { alerts } from './seed-demo-alerts-data';
import { auditLogs } from './seed-demo-audit-data';
import { settings } from './seed-demo-settings-data';
import { insertRow, requireSeedEnv } from './seed-utils';

export async function seedDemoOperations(
  prisma: PrismaClient,
): Promise<number> {
  const adminId = await findAdminId(prisma);
  let count = 0;
  for (const row of alerts(adminId))
    count += await insertRow(prisma, 'alerts', row);
  for (const row of settings())
    count += await insertRow(prisma, 'system_settings', row);
  for (const row of auditLogs(adminId))
    count += await insertRow(prisma, 'audit_logs', row);
  return count;
}

async function findAdminId(prisma: PrismaClient): Promise<string> {
  const email = requireSeedEnv('SEED_ADMIN_EMAIL').toLowerCase();
  const users = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    select id from charging_system.users
    where email = ${email}::public.citext limit 1;
  `);
  if (!users[0]) throw new Error('Run db:seed:core before db:seed:demo.');
  return users[0].id;
}

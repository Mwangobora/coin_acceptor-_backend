import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

import {
  credential,
  device,
  locker,
  packages,
  port,
  station,
} from './seed-demo-foundation-data';
import { ids } from './seed-demo-ids';
import { insertRow } from './seed-utils';

export async function seedDemoFoundation(
  prisma: PrismaClient,
): Promise<number> {
  let count = 0;
  count += await insertRow(prisma, 'stations', station());
  count += await insertRow(prisma, 'devices', device());
  count += await insertRow(prisma, 'device_credentials', await credential());
  for (let index = 0; index < ids.lockers.length; index += 1) {
    count += await insertRow(prisma, 'lockers', locker(index));
    count += await insertRow(prisma, 'charging_ports', port(index));
  }
  for (const row of packages())
    count += await insertRow(prisma, 'charging_packages', row);
  await normalizePackageValidity(prisma);
  return count;
}

async function normalizePackageValidity(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRaw(Prisma.sql`
    update charging_system.charging_packages
    set valid_from = '2026-07-01T00:00:00.000Z'::timestamptz
    where id in (${Prisma.join(ids.packages.map((id) => Prisma.sql`${id}::uuid`))});
  `);
}

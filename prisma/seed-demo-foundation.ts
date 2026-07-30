import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

import {
  LEGACY_DEMO_LOCKER_IDS,
  LEGACY_DEMO_PORT_IDS,
} from '../src/apps/settings/constants/hardware-settings.constants';
import {
  credential,
  device,
  locker,
  packages,
  port,
  station,
} from './seed-demo-foundation-data';
import { ids } from './seed-demo-ids';
import { upsertRow } from './seed-utils';

export async function seedDemoFoundation(
  prisma: PrismaClient,
): Promise<number> {
  let count = 0;
  await removeLegacyDemoSlots(prisma);
  count += await upsertRow(prisma, 'stations', station());
  count += await upsertRow(prisma, 'devices', device());
  count += await upsertRow(prisma, 'device_credentials', await credential());
  for (let index = 0; index < ids.lockers.length; index += 1) {
    count += await upsertRow(prisma, 'lockers', locker(index));
    count += await upsertRow(prisma, 'charging_ports', port(index));
  }
  for (const row of packages())
    count += await upsertRow(prisma, 'charging_packages', row);
  await normalizePackageValidity(prisma);
  return count;
}

async function removeLegacyDemoSlots(prisma: PrismaClient) {
  await prisma.charging_ports.deleteMany({
    where: { id: { in: [...LEGACY_DEMO_PORT_IDS] } },
  });
  await prisma.lockers.deleteMany({
    where: { id: { in: [...LEGACY_DEMO_LOCKER_IDS] } },
  });
}

async function normalizePackageValidity(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRaw(Prisma.sql`
    update charging_system.charging_packages
    set valid_from = '2026-07-01T00:00:00.000Z'::timestamptz
    where id in (${Prisma.join(ids.packages.map((id) => Prisma.sql`${id}::uuid`))});
  `);
}

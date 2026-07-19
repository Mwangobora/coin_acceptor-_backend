import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

import { ids } from './seed-demo-ids';
import { hashSecret, insertRow } from './seed-utils';

export async function seedDemoSessions(prisma: PrismaClient): Promise<number> {
  let count = 0;
  count += await insertRow(prisma, 'charging_sessions', await session(0));
  count += await insertRow(prisma, 'charging_sessions', await session(1));
  count += await insertRow(prisma, 'charging_session_payments', link(0));
  count += await insertRow(prisma, 'charging_session_payments', link(1));
  await markCompleted(prisma);
  await markActive(prisma);
  return count;
}

async function session(index: number) {
  return {
    id: ids.sessions[index],
    session_reference: `DEMO-SESSION-00${index + 1}`,
    station_id: ids.station,
    device_id: ids.device,
    locker_id: ids.lockers[index],
    charging_port_id: ids.ports[index],
    status: 'pending',
    access_code_hash: await hashSecret(`demo-locker-code-${index + 1}`),
    access_code_expires_at: new Date('2026-07-19T12:30:00.000Z'),
    metadata: { seed: 'demo' },
  };
}

function link(index: number) {
  return {
    id: `00000000-0000-4000-8000-00000000061${index}`,
    charging_session_id: ids.sessions[index],
    payment_id: ids.payments[index],
    purpose: 'initial',
    duration_seconds_added: index === 0 ? 900 : 1800,
    amount_minor: index === 0 ? 500 : 1000,
    currency: 'TZS',
  };
}

async function markCompleted(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRaw(Prisma.sql`
    update charging_system.charging_sessions
    set status = 'completed',
        remaining_seconds = 0,
        power_source_at_start = 'grid',
        power_source_at_end = 'grid',
        started_at = '2026-07-19T09:15:00.000Z'::timestamptz,
        expected_end_at = '2026-07-19T09:30:00.000Z'::timestamptz,
        last_progress_at = '2026-07-19T09:29:00.000Z'::timestamptz,
        ended_at = '2026-07-19T09:30:00.000Z'::timestamptz,
        termination_reason = 'completed normally'
    where id = ${ids.sessions[0]}::uuid;
  `);
}

async function markActive(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRaw(Prisma.sql`
    update charging_system.charging_sessions
    set status = 'active',
        power_source_at_start = 'backup_battery',
        started_at = '2026-07-19T09:20:00.000Z'::timestamptz,
        expected_end_at = '2026-07-19T09:50:00.000Z'::timestamptz,
        last_progress_at = '2026-07-19T09:35:00.000Z'::timestamptz
    where id = ${ids.sessions[1]}::uuid;
  `);
}

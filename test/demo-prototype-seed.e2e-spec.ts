import { PrismaClient } from '@prisma/client';

import {
  COIN_PULSE_MAPPING_SETTING_KEY,
  HARDWARE_CAPABILITIES_SETTING_KEY,
} from '../src/apps/settings/constants/hardware-settings.constants';
import { seedDemoEvents } from '../prisma/seed-demo-events';
import { seedDemoFoundation } from '../prisma/seed-demo-foundation';
import { seedDemoOperations } from '../prisma/seed-demo-operations';
import { createUser, testDatabaseUrl } from './auth-test-utils';

jest.setTimeout(30_000);

describe('demo prototype seed', () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: testDatabaseUrl } },
  });

  beforeAll(async () => {
    process.env.SEED_ADMIN_EMAIL = 'seed-admin@example.com';
    await createUser(prisma, { email: process.env.SEED_ADMIN_EMAIL });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('seeds exactly two lockers, one port per locker, and stays idempotent', async () => {
    await seedDemoFoundation(prisma);
    await seedDemoEvents(prisma);
    await seedDemoOperations(prisma);
    await seedDemoFoundation(prisma);
    await seedDemoEvents(prisma);
    await seedDemoOperations(prisma);

    const lockers = await prisma.lockers.findMany({
      where: { device_id: '00000000-0000-4000-8000-000000000002' },
      orderBy: { locker_number: 'asc' },
      include: { charging_ports: true },
    });
    expect(lockers).toHaveLength(2);
    expect(lockers.map((locker) => locker.locker_number)).toEqual([1, 2]);
    expect(lockers.every((locker) => locker.charging_ports.length === 1)).toBe(
      true,
    );
    expect(lockers.map((locker) => locker.charging_ports)).toEqual([
      [expect.objectContaining({ hardware_channel: 'RELAY1_GPIO26' })],
      [expect.objectContaining({ hardware_channel: 'RELAY2_GPIO25' })],
    ]);
  });

  it('stores the prototype pulse mapping and offline capabilities', async () => {
    const pulse = await prisma.system_settings.findFirstOrThrow({
      where: { setting_key: COIN_PULSE_MAPPING_SETTING_KEY },
    });
    const capabilities = await prisma.system_settings.findFirstOrThrow({
      where: { setting_key: HARDWARE_CAPABILITIES_SETTING_KEY },
    });
    expect(pulse.value_json).toMatchObject({
      currency: 'TZS',
      entries: [
        { pulseCount: 4, amountMinor: 50, durationSeconds: 20 },
        { pulseCount: 8, amountMinor: 100, durationSeconds: 40 },
        { pulseCount: 12, amountMinor: 200, durationSeconds: 60 },
        { pulseCount: 16, amountMinor: 500, durationSeconds: 120 },
      ],
    });
    expect(capabilities.value_json).toMatchObject({
      supportsQr: false,
      supportsRemoteCommands: false,
      supportsTelemetry: false,
      firmwareIntegrationStatus: 'prototype_offline',
    });
  });
});

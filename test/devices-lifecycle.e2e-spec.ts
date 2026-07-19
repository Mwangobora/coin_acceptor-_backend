import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import {
  createTestApp,
  createUser,
  grantPermissions,
  loginCookies,
} from './auth-test-utils';

const devicePerms = ['devices.read', 'devices.update', 'devices.disable'];

describe('Device lifecycle API', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let server: Parameters<typeof request>[0];
  let cookies: string;

  beforeAll(async () => {
    ({ app, prisma, server } = await createTestApp());
    const admin = await createUser(prisma, {
      email: 'devices-lifecycle-admin@example.com',
    });
    await grantPermissions(prisma, admin.id, devicePerms);
    cookies = await loginCookies(server, 'devices-lifecycle-admin@example.com');
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('enforces transitions, active sessions and scoped reads', async () => {
    const station = await stationRecord(prisma, 'DEVICE_STATION_D', 'active');
    const target = await stationRecord(prisma, 'DEVICE_STATION_E', 'active');
    const device = await deviceRecord(
      prisma,
      station.id,
      'LIFE_DEVICE',
      'LIFE_SERIAL',
    );

    await request(server)
      .patch(`/api/v1/devices/${device.id}/lifecycle-status`)
      .set('Cookie', cookies)
      .send({ lifecycleStatus: 'decommissioned', reason: 'retired' })
      .expect(409);
    await request(server)
      .patch(`/api/v1/devices/${device.id}/lifecycle-status`)
      .set('Cookie', cookies)
      .send({ lifecycleStatus: 'active' })
      .expect(200);
    await request(server)
      .patch(`/api/v1/devices/${device.id}`)
      .set('Cookie', cookies)
      .send({ stationId: target.id })
      .expect(409);
    await request(server)
      .patch(`/api/v1/devices/${device.id}/lifecycle-status`)
      .set('Cookie', cookies)
      .send({ lifecycleStatus: 'disabled' })
      .expect(400);
    await activeSession(prisma, station.id, device.id);
    await request(server)
      .patch(`/api/v1/devices/${device.id}/lifecycle-status`)
      .set('Cookie', cookies)
      .send({ lifecycleStatus: 'decommissioned', reason: 'retired' })
      .expect(409);

    const scoped = await createUser(prisma, {
      email: 'device-scoped@example.com',
    });
    await grantPermissions(prisma, scoped.id, ['devices.read'], station.id);
    const scopedCookies = await loginCookies(
      server,
      'device-scoped@example.com',
    );
    const list = await request(server)
      .get('/api/v1/devices')
      .set('Cookie', scopedCookies)
      .expect(200);
    const items = (list.body as { items: Array<{ id: string }> }).items;
    expect(items.some((item) => item.id === device.id)).toBe(true);
    await expect(
      prisma.audit_logs.findFirstOrThrow({
        where: {
          entity_id: device.id,
          action: 'devices.lifecycle_status_changed',
        },
      }),
    ).resolves.toBeDefined();
  });
});

function stationRecord(prisma: PrismaClient, code: string, status: string) {
  return prisma.stations.create({
    data: {
      code,
      name: code,
      station_type: 'brt_station',
      region: 'Dar',
      status,
    },
  });
}

function deviceRecord(
  prisma: PrismaClient,
  stationId: string,
  code: string,
  serial: string,
) {
  return prisma.devices.create({
    data: {
      station_id: stationId,
      device_code: code,
      serial_number: serial,
      name: code,
    },
  });
}

async function activeSession(
  prisma: PrismaClient,
  stationId: string,
  deviceId: string,
) {
  const locker = await prisma.lockers.create({
    data: { device_id: deviceId, locker_number: 1 },
  });
  const port = await prisma.charging_ports.create({
    data: {
      device_id: deviceId,
      locker_id: locker.id,
      port_number: 1,
      port_type: 'usb_a',
    },
  });
  await prisma.charging_sessions.create({
    data: {
      session_reference: `SESSION_${Date.now()}`,
      station_id: stationId,
      device_id: deviceId,
      locker_id: locker.id,
      charging_port_id: port.id,
      status: 'active',
      access_code_hash: 'hashed-code',
      purchased_duration_seconds: 3600,
      remaining_seconds: 3600,
      total_paid_minor: 1000,
      started_at: new Date(),
      expected_end_at: new Date(Date.now() + 3600_000),
    },
  });
}

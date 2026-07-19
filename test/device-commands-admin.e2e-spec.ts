import { PrismaClient } from '@prisma/client';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';

import {
  createTestApp,
  createUser,
  grantPermissions,
  loginCookies,
} from './auth-test-utils';
import {
  deviceRecord,
  lockerRecord,
  portRecord,
  stationRecord,
} from './admin-resource-test-utils';

jest.setTimeout(30_000);

describe('device command admin APIs', () => {
  let app: INestApplication;
  let server: Server;
  let prisma: PrismaClient;
  let stationId: string;
  let deviceId: string;
  let otherDeviceId: string;
  let cookies: string;

  beforeAll(async () => {
    ({ app, server, prisma } = await createTestApp());
    const station = await stationRecord(prisma, 'COMMAND_ADMIN_STATION');
    const device = await deviceRecord(
      prisma,
      station.id,
      'COMMAND_ADMIN_DEVICE',
      'active',
    );
    const other = await deviceRecord(
      prisma,
      station.id,
      'COMMAND_ADMIN_OTHER',
      'active',
    );
    stationId = station.id;
    deviceId = device.id;
    otherDeviceId = other.id;
    const user = await createUser(prisma, {
      email: 'command-admin@example.com',
    });
    await grantPermissions(
      prisma,
      user.id,
      [
        'device_commands.read',
        'device_commands.create',
        'device_commands.cancel',
        'lockers.emergency_open',
      ],
      stationId,
    );
    cookies = await loginCookies(server, user.email);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await app?.close();
  });

  it('creates commands idempotently and rejects unsafe creation', async () => {
    const first = await command('device.status_request', {
      diagnostic: true,
    })
      .send({ idempotencyKey: 'command-idem-1' })
      .expect(201);
    await command('device.status_request', { diagnostic: true })
      .send({ idempotencyKey: 'command-idem-1' })
      .expect(({ body }) => {
        const duplicate = body as BodyId;
        expect(duplicate.id).toBe((first.body as BodyId).id);
      });
    await command('device.status_request', { diagnostic: false })
      .send({ idempotencyKey: 'command-idem-1' })
      .expect(409);
    await command('device.status_request', { secret: 'x' }).expect(400);
  });

  it('validates ownership and emergency-open controls', async () => {
    const locker = await lockerRecord(prisma, deviceId, 5);
    const otherLocker = await lockerRecord(prisma, otherDeviceId, 6);
    const port = await portRecord(prisma, { deviceId, lockerId: locker.id });
    const otherPort = await portRecord(prisma, {
      deviceId: otherDeviceId,
      lockerId: otherLocker.id,
    });
    await command('locker.lock', { lockerId: otherLocker.id }).expect(400);
    await command('port.power_on', { portId: otherPort.id }).expect(400);
    await command('port.power_on', { portId: port.id }).expect(201);
    await command('locker.emergency_open', { lockerId: locker.id }).expect(400);
    const emergency = await command(
      'locker.emergency_open',
      { lockerId: locker.id },
      'Door jammed',
    ).expect(201);
    expect(
      await prisma.audit_logs.count({
        where: { entity_id: (emergency.body as BodyId).id },
      }),
    ).toBeGreaterThanOrEqual(2);
  });

  it('enforces station scope, cancellation rules, and response sanitizing', async () => {
    const unsafe = await prisma.device_commands.create({
      data: {
        station_id: stationId,
        device_id: deviceId,
        command_type: 'device.status_request',
        payload: { token: 'hidden', safe: true },
      },
    });
    await request(server)
      .get('/api/v1/device-commands')
      .set('Cookie', cookies)
      .expect(({ body }) =>
        expect(JSON.stringify(body)).not.toContain('hidden'),
      );
    await request(server)
      .get(`/api/v1/device-commands/${unsafe.id}`)
      .set('Cookie', cookies)
      .expect(200);
    await request(server)
      .post(`/api/v1/device-commands/${unsafe.id}/cancel`)
      .set('Cookie', cookies)
      .send({ reason: 'duplicate' })
      .expect(201);
    await request(server)
      .post(`/api/v1/device-commands/${unsafe.id}/cancel`)
      .set('Cookie', cookies)
      .send({ reason: 'too late' })
      .expect(409);
    await expectScopedOut();
  });

  function command(type: string, payload: object, reason?: string) {
    const base = { commandType: type, payload, reason };
    return {
      send: (extra: object = {}) =>
        request(server)
          .post(`/api/v1/devices/${deviceId}/commands`)
          .set('Cookie', cookies)
          .send({ ...base, ...extra }),
      expect: (status: number) =>
        request(server)
          .post(`/api/v1/devices/${deviceId}/commands`)
          .set('Cookie', cookies)
          .send(base)
          .expect(status),
    };
  }

  async function expectScopedOut() {
    const otherStation = await stationRecord(
      prisma,
      'COMMAND_ADMIN_OTHER_STATION',
    );
    const device = await deviceRecord(
      prisma,
      otherStation.id,
      'COMMAND_SCOPE_DEVICE',
      'active',
    );
    const commandRow = await prisma.device_commands.create({
      data: {
        station_id: otherStation.id,
        device_id: device.id,
        command_type: 'device.status_request',
      },
    });
    await request(server)
      .get(`/api/v1/device-commands/${commandRow.id}`)
      .set('Cookie', cookies)
      .expect(403);
  }
});

type BodyId = { id: string };

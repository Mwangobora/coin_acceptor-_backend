import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import {
  createTestApp,
  createUser,
  grantPermissions,
  loginCookies,
} from './auth-test-utils';

const devicePerms = [
  'devices.read',
  'devices.create',
  'devices.update',
  'devices.disable',
];

describe('Devices API', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let server: Parameters<typeof request>[0];
  let cookies: string;

  beforeAll(async () => {
    ({ app, prisma, server } = await createTestApp());
    const admin = await createUser(prisma, {
      email: 'devices-admin@example.com',
    });
    await grantPermissions(prisma, admin.id, devicePerms);
    cookies = await loginCookies(server, 'devices-admin@example.com');
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('rejects unauthenticated and unauthorized device reads', async () => {
    await request(server).get('/api/v1/devices').expect(401);
    await createUser(prisma, { email: 'devices-noperms@example.com' });
    const noPermCookies = await loginCookies(
      server,
      'devices-noperms@example.com',
    );
    await request(server)
      .get('/api/v1/devices')
      .set('Cookie', noPermCookies)
      .expect(403);
  });

  it('creates, lists, reads and updates devices without hardware fields', async () => {
    const station = await stationRecord(prisma, 'DEVICE_STATION_A', 'active');
    const target = await stationRecord(prisma, 'DEVICE_STATION_B', 'active');
    const inactive = await stationRecord(
      prisma,
      'DEVICE_STATION_C',
      'inactive',
    );

    await request(server)
      .post('/api/v1/devices')
      .set('Cookie', cookies)
      .send({
        stationId: station.id,
        deviceCode: 'D1',
        serialNumber: 'S1',
        name: 'Device',
        connectivityStatus: 'online',
      })
      .expect(400);
    await request(server)
      .post('/api/v1/devices')
      .set('Cookie', cookies)
      .send({
        stationId: inactive.id,
        deviceCode: 'D2',
        serialNumber: 'S2',
        name: 'Device',
      })
      .expect(400);

    const created = await request(server)
      .post('/api/v1/devices')
      .set('Cookie', cookies)
      .send({
        stationId: station.id,
        deviceCode: 'coin device',
        serialNumber: 'SERIAL_A',
        name: 'Coin Device',
      })
      .expect(201);
    const deviceId = (created.body as { id: string }).id;
    expect(created.body).toMatchObject({
      lifecycleStatus: 'pending',
      connectivityStatus: 'unknown',
    });

    await request(server)
      .post('/api/v1/devices')
      .set('Cookie', cookies)
      .send({
        stationId: station.id,
        deviceCode: 'COIN_DEVICE',
        serialNumber: 'SERIAL_A2',
        name: 'Duplicate',
      })
      .expect(409);
    await request(server)
      .get('/api/v1/devices?search=coin&sortBy=deviceCode')
      .set('Cookie', cookies)
      .expect(200);
    await request(server)
      .get(`/api/v1/stations/${station.id}/devices`)
      .set('Cookie', cookies)
      .expect(200);
    await request(server)
      .get(`/api/v1/devices/${deviceId}`)
      .set('Cookie', cookies)
      .expect(200);
    await request(server)
      .patch(`/api/v1/devices/${deviceId}`)
      .set('Cookie', cookies)
      .send({ firmwareVersion: '1.0.0' })
      .expect(400);
    const moved = await request(server)
      .patch(`/api/v1/devices/${deviceId}`)
      .set('Cookie', cookies)
      .send({
        stationId: target.id,
        metadata: { location: 'north', secretToken: 'hidden' },
      })
      .expect(200);
    expect((moved.body as { metadata: unknown }).metadata).toEqual({
      location: 'north',
    });
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

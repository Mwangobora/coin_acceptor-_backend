import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import {
  createTestApp,
  createUser,
  grantPermissions,
  loginCookies,
} from './auth-test-utils';

const stationPerms = [
  'stations.read',
  'stations.create',
  'stations.update',
  'stations.deactivate',
  'devices.create',
];

describe('Stations API', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let server: Parameters<typeof request>[0];
  let cookies: string;

  beforeAll(async () => {
    ({ app, prisma, server } = await createTestApp());
    const admin = await createUser(prisma, {
      email: 'stations-admin@example.com',
    });
    await grantPermissions(prisma, admin.id, stationPerms);
    cookies = await loginCookies(server, 'stations-admin@example.com');
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('rejects unauthenticated and unauthorized station reads', async () => {
    await request(server).get('/api/v1/stations').expect(401);
    await createUser(prisma, { email: 'stations-noperms@example.com' });
    const noPermCookies = await loginCookies(
      server,
      'stations-noperms@example.com',
    );
    await request(server)
      .get('/api/v1/stations')
      .set('Cookie', noPermCookies)
      .expect(403);
  });

  it('creates, lists, reads and updates stations with validation', async () => {
    await request(server)
      .post('/api/v1/stations')
      .set('Cookie', cookies)
      .send({
        code: 'bad_coords',
        name: 'Bad',
        stationType: 'brt_station',
        region: 'Dar',
        latitude: -6.8,
      })
      .expect(400);

    const created = await request(server)
      .post('/api/v1/stations')
      .set('Cookie', cookies)
      .send({
        code: 'main station',
        name: 'Main Station',
        stationType: 'brt_station',
        region: 'Dar',
      })
      .expect(201);
    const stationId = (created.body as { id: string }).id;

    await request(server)
      .post('/api/v1/stations')
      .set('Cookie', cookies)
      .send({
        code: 'MAIN_STATION',
        name: 'Duplicate',
        stationType: 'brt_station',
        region: 'Dar',
      })
      .expect(409);
    await request(server)
      .get('/api/v1/stations?search=main&sortBy=name')
      .set('Cookie', cookies)
      .expect(200);
    await request(server)
      .get(`/api/v1/stations/${stationId}`)
      .set('Cookie', cookies)
      .expect(200);
    await request(server)
      .patch(`/api/v1/stations/${stationId}`)
      .set('Cookie', cookies)
      .send({ code: 'NEW' })
      .expect(400);
    await request(server)
      .patch(`/api/v1/stations/${stationId}`)
      .set('Cookie', cookies)
      .send({ name: 'Main Station Updated' })
      .expect(200);
    await request(server)
      .patch(`/api/v1/stations/${stationId}/status`)
      .set('Cookie', cookies)
      .send({ status: 'maintenance' })
      .expect(400);
    await request(server)
      .patch(`/api/v1/stations/${stationId}/status`)
      .set('Cookie', cookies)
      .send({ status: 'maintenance', reason: 'planned' })
      .expect(200);

    await expect(
      prisma.audit_logs.findFirstOrThrow({
        where: { entity_id: stationId, action: 'stations.updated' },
      }),
    ).resolves.toBeDefined();
  });

  it('enforces decommissioning rules and station-scoped RBAC', async () => {
    const station = await stationRecord(prisma, 'SCOPED_STATION');
    await prisma.devices.create({
      data: {
        station_id: station.id,
        device_code: 'SCOPED_DEVICE',
        serial_number: 'SCOPED_SERIAL',
        name: 'Scoped Device',
      },
    });

    await request(server)
      .patch(`/api/v1/stations/${station.id}/status`)
      .set('Cookie', cookies)
      .send({ status: 'decommissioned', reason: 'retired' })
      .expect(409);
    await prisma.devices.updateMany({
      where: { station_id: station.id },
      data: { lifecycle_status: 'decommissioned' },
    });
    await request(server)
      .patch(`/api/v1/stations/${station.id}/status`)
      .set('Cookie', cookies)
      .send({ status: 'decommissioned', reason: 'retired' })
      .expect(200);
    await request(server)
      .patch(`/api/v1/stations/${station.id}/status`)
      .set('Cookie', cookies)
      .send({ status: 'active' })
      .expect(409);

    const scoped = await createUser(prisma, {
      email: 'station-scoped@example.com',
    });
    await grantPermissions(prisma, scoped.id, ['stations.read'], station.id);
    const scopedCookies = await loginCookies(
      server,
      'station-scoped@example.com',
    );
    const list = await request(server)
      .get('/api/v1/stations')
      .set('Cookie', scopedCookies)
      .expect(200);
    const items = (list.body as { items: Array<{ id: string }> }).items;
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(station.id);
  });
});

function stationRecord(prisma: PrismaClient, code: string) {
  return prisma.stations.create({
    data: {
      code,
      name: code,
      station_type: 'brt_station',
      region: 'Dar',
      status: 'active',
    },
  });
}

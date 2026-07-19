import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import {
  activeSession,
  deviceRecord,
  lockerRecord,
  portRecord,
  stationRecord,
} from './admin-resource-test-utils';
import {
  createTestApp,
  createUser,
  grantPermissions,
  loginCookies,
} from './auth-test-utils';

describe('Locker admin APIs', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let server: Parameters<typeof request>[0];
  let cookies: string;

  beforeAll(async () => {
    ({ app, prisma, server } = await createTestApp());
    const admin = await createUser(prisma, {
      email: 'locker-admin@example.com',
    });
    await grantPermissions(prisma, admin.id, [
      'lockers.read',
      'lockers.configure',
    ]);
    cookies = await loginCookies(server, 'locker-admin@example.com');
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('rejects unauthenticated and unauthorized locker reads', async () => {
    await request(server).get('/api/v1/lockers').expect(401);
    await createUser(prisma, { email: 'locker-noperms@example.com' });
    const noPermCookies = await loginCookies(
      server,
      'locker-noperms@example.com',
    );
    await request(server)
      .get('/api/v1/lockers')
      .set('Cookie', noPermCookies)
      .expect(403);
  });

  it('creates, lists, reads and updates lockers with immutable hardware fields', async () => {
    const station = await stationRecord(prisma, 'LOCKER_STATION_A');
    const device = await deviceRecord(prisma, station.id, 'LOCKER_DEVICE_A');

    await request(server)
      .post(`/api/v1/devices/${device.id}/lockers`)
      .set('Cookie', cookies)
      .send({ lockerNumber: 1, doorStatus: 'open' })
      .expect(400);
    const created = await request(server)
      .post(`/api/v1/devices/${device.id}/lockers`)
      .set('Cookie', cookies)
      .send({ lockerNumber: 1, label: 'A1' })
      .expect(201);
    const lockerId = (created.body as { id: string }).id;
    expect(created.body).toMatchObject({ availabilityStatus: 'available' });

    await request(server)
      .post(`/api/v1/devices/${device.id}/lockers`)
      .set('Cookie', cookies)
      .send({ lockerNumber: 1 })
      .expect(409);
    await request(server)
      .get('/api/v1/lockers?search=A1')
      .set('Cookie', cookies)
      .expect(200);
    await request(server)
      .get(`/api/v1/devices/${device.id}/lockers`)
      .set('Cookie', cookies)
      .expect(200);
    await request(server)
      .get(`/api/v1/lockers/${lockerId}`)
      .set('Cookie', cookies)
      .expect(200);
    await request(server)
      .patch(`/api/v1/lockers/${lockerId}`)
      .set('Cookie', cookies)
      .send({ lockerNumber: 2 })
      .expect(400);
    await request(server)
      .patch(`/api/v1/lockers/${lockerId}`)
      .set('Cookie', cookies)
      .send({ label: 'A2' })
      .expect(200);
  });

  it('validates availability transitions and active-session conflicts', async () => {
    const station = await stationRecord(prisma, 'LOCKER_STATION_B');
    const device = await deviceRecord(prisma, station.id, 'LOCKER_DEVICE_B');
    const locker = await lockerRecord(prisma, device.id, 1);

    await request(server)
      .patch(`/api/v1/lockers/${locker.id}/availability-status`)
      .set('Cookie', cookies)
      .send({ availabilityStatus: 'maintenance' })
      .expect(400);
    await prisma.lockers.update({
      where: { id: locker.id },
      data: { door_status: 'open' },
    });
    await request(server)
      .patch(`/api/v1/lockers/${locker.id}/availability-status`)
      .set('Cookie', cookies)
      .send({ availabilityStatus: 'available' })
      .expect(409);
    await prisma.lockers.update({
      where: { id: locker.id },
      data: { door_status: 'closed' },
    });
    const port = await portRecord(prisma, {
      deviceId: device.id,
      lockerId: locker.id,
    });
    await activeSession(prisma, {
      stationId: station.id,
      deviceId: device.id,
      lockerId: locker.id,
      portId: port.id,
    });
    await request(server)
      .patch(`/api/v1/lockers/${locker.id}/availability-status`)
      .set('Cookie', cookies)
      .send({ availabilityStatus: 'disabled', reason: 'maintenance' })
      .expect(409);
  });

  it('enforces station-scoped locker reads and audits admin changes', async () => {
    const station = await stationRecord(prisma, 'LOCKER_STATION_C');
    const device = await deviceRecord(prisma, station.id, 'LOCKER_DEVICE_C');
    const locker = await lockerRecord(prisma, device.id, 1);
    const scoped = await createUser(prisma, {
      email: 'locker-scoped@example.com',
    });
    await grantPermissions(prisma, scoped.id, ['lockers.read'], station.id);
    const scopedCookies = await loginCookies(
      server,
      'locker-scoped@example.com',
    );

    const list = await request(server)
      .get('/api/v1/lockers')
      .set('Cookie', scopedCookies)
      .expect(200);
    const ids = (list.body as { items: Array<{ id: string }> }).items.map(
      (item) => item.id,
    );
    expect(ids).toContain(locker.id);
    await request(server)
      .patch(`/api/v1/lockers/${locker.id}`)
      .set('Cookie', cookies)
      .send({ label: 'audited' })
      .expect(200);
    await expect(
      prisma.audit_logs.findFirstOrThrow({
        where: { action: 'lockers.updated', entity_id: locker.id },
      }),
    ).resolves.toBeDefined();
  });
});

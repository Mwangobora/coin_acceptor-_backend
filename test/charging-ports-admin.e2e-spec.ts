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

describe('Charging port admin APIs', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let server: Parameters<typeof request>[0];
  let cookies: string;

  beforeAll(async () => {
    ({ app, prisma, server } = await createTestApp());
    const admin = await createUser(prisma, { email: 'port-admin@example.com' });
    await grantPermissions(prisma, admin.id, [
      'charging_ports.read',
      'charging_ports.configure',
    ]);
    cookies = await loginCookies(server, 'port-admin@example.com');
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('rejects unauthenticated and unauthorized charging-port reads', async () => {
    await request(server).get('/api/v1/charging-ports').expect(401);
    await createUser(prisma, { email: 'port-noperms@example.com' });
    const noPermCookies = await loginCookies(
      server,
      'port-noperms@example.com',
    );
    await request(server)
      .get('/api/v1/charging-ports')
      .set('Cookie', noPermCookies)
      .expect(403);
  });

  it('creates, lists and reads charging ports with derived device ownership', async () => {
    const station = await stationRecord(prisma, 'PORT_STATION_A');
    const device = await deviceRecord(
      prisma,
      station.id,
      'PORT_DEVICE_A',
      'maintenance',
    );
    const locker = await lockerRecord(prisma, device.id, 1);

    await request(server)
      .post(`/api/v1/lockers/${locker.id}/charging-ports`)
      .set('Cookie', cookies)
      .send({ portNumber: 1, portType: 'usb_a', maximumVoltage: 0 })
      .expect(400);
    const created = await request(server)
      .post(`/api/v1/lockers/${locker.id}/charging-ports`)
      .set('Cookie', cookies)
      .send({ portNumber: 1, portType: 'usb_c', hardwareChannel: 'CH1' })
      .expect(201);
    const portId = (created.body as { id: string; deviceId: string }).id;
    expect((created.body as { deviceId: string }).deviceId).toBe(device.id);

    await request(server)
      .post(`/api/v1/lockers/${locker.id}/charging-ports`)
      .set('Cookie', cookies)
      .send({ portNumber: 1, portType: 'usb_a' })
      .expect(409);
    await request(server)
      .post(`/api/v1/lockers/${locker.id}/charging-ports`)
      .set('Cookie', cookies)
      .send({ portNumber: 2, portType: 'usb_a', hardwareChannel: 'CH1' })
      .expect(409);
    await request(server)
      .get('/api/v1/charging-ports')
      .set('Cookie', cookies)
      .expect(200);
    await request(server)
      .get(`/api/v1/lockers/${locker.id}/charging-ports`)
      .set('Cookie', cookies)
      .expect(200);
    await request(server)
      .get(`/api/v1/charging-ports/${portId}`)
      .set('Cookie', cookies)
      .expect(200);
  });

  it('protects hardware-owned power state and validates reconfiguration', async () => {
    const station = await stationRecord(prisma, 'PORT_STATION_B');
    const device = await deviceRecord(
      prisma,
      station.id,
      'PORT_DEVICE_B',
      'maintenance',
    );
    const locker = await lockerRecord(prisma, device.id, 1);
    const port = await portRecord(prisma, {
      deviceId: device.id,
      lockerId: locker.id,
      hardwareChannel: 'P1',
    });

    await request(server)
      .patch(`/api/v1/charging-ports/${port.id}`)
      .set('Cookie', cookies)
      .send({ powerState: 'on' })
      .expect(400);
    await prisma.charging_ports.update({
      where: { id: port.id },
      data: { power_state: 'on' },
    });
    await request(server)
      .patch(`/api/v1/charging-ports/${port.id}`)
      .set('Cookie', cookies)
      .send({ portType: 'usb_c' })
      .expect(409);
    await prisma.charging_ports.update({
      where: { id: port.id },
      data: { power_state: 'off' },
    });
    await request(server)
      .patch(`/api/v1/charging-ports/${port.id}`)
      .set('Cookie', cookies)
      .send({ hardwareChannel: 'P2' })
      .expect(200);
  });

  it('validates status transitions, active sessions and scoped reads', async () => {
    const station = await stationRecord(prisma, 'PORT_STATION_C');
    const device = await deviceRecord(prisma, station.id, 'PORT_DEVICE_C');
    const locker = await lockerRecord(prisma, device.id, 1);
    const created = await request(server)
      .post(`/api/v1/lockers/${locker.id}/charging-ports`)
      .set('Cookie', cookies)
      .send({ portNumber: 1, portType: 'usb_a' })
      .expect(201);
    const port = { id: (created.body as { id: string }).id };

    await request(server)
      .patch(`/api/v1/charging-ports/${port.id}/status`)
      .set('Cookie', cookies)
      .send({ status: 'maintenance' })
      .expect(400);
    await activeSession(prisma, {
      stationId: station.id,
      deviceId: device.id,
      lockerId: locker.id,
      portId: port.id,
    });
    await request(server)
      .patch(`/api/v1/charging-ports/${port.id}/status`)
      .set('Cookie', cookies)
      .send({ status: 'disabled', reason: 'test' })
      .expect(409);

    const scoped = await createUser(prisma, {
      email: 'port-scoped@example.com',
    });
    await grantPermissions(
      prisma,
      scoped.id,
      ['charging_ports.read'],
      station.id,
    );
    const scopedCookies = await loginCookies(server, 'port-scoped@example.com');
    const list = await request(server)
      .get('/api/v1/charging-ports')
      .set('Cookie', scopedCookies)
      .expect(200);
    const ids = (list.body as { items: Array<{ id: string }> }).items.map(
      (item) => item.id,
    );
    expect(ids).toContain(port.id);
    await expect(
      prisma.audit_logs.findFirstOrThrow({
        where: { action: 'charging_ports.created', entity_id: port.id },
      }),
    ).resolves.toBeDefined();
  });
});

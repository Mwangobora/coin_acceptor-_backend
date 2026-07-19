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
import {
  apiCredential,
  auth,
  event,
  lockerEvent,
  portEvent,
  telemetry,
} from './device-ingestion-test-utils';

describe('device ingestion telemetry and admin reads', () => {
  let app: INestApplication;
  let server: Server;
  let prisma: PrismaClient;
  let stationId: string;
  let deviceId: string;
  let apiKeyId: string;
  const apiSecret = 'cak_admin_test_secret';

  beforeAll(async () => {
    ({ app, server, prisma } = await createTestApp());
    const station = await stationRecord(prisma, 'INGEST_ADMIN_STATION');
    const device = await deviceRecord(
      prisma,
      station.id,
      'INGEST_ADMIN_DEVICE',
      'active',
    );
    stationId = station.id;
    deviceId = device.id;
    apiKeyId = await apiCredential(prisma, deviceId, apiSecret);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('processes telemetry exactly once', async () => {
    const telemetryEvent = telemetry('admin-telemetry-ok', {
      batteryPercentage: 50,
    });
    const telem = await ingest(telemetryEvent);
    const telemBody = telem.body as IngestResponse;
    await request(server)
      .post('/api/v1/device-ingestion/events')
      .set('Authorization', auth(apiKeyId, apiSecret))
      .send(telemetryEvent)
      .expect(({ body }) => {
        expect((body as IngestResponse).duplicate).toBe(true);
      });
    expect(
      await prisma.device_telemetry.count({
        where: { device_event_id: telemBody.eventId },
      }),
    ).toBe(1);
  });

  it('protects hardware ownership and administrative fields', async () => {
    const locker = await lockerRecord(prisma, deviceId, 8);
    const port = await portRecord(prisma, {
      deviceId,
      lockerId: locker.id,
      portNumber: 8,
    });
    const otherStation = await stationRecord(prisma, 'INGEST_OTHER');
    const otherDevice = await deviceRecord(
      prisma,
      otherStation.id,
      'INGEST_OTHER_DEVICE',
      'active',
    );
    const otherLocker = await lockerRecord(prisma, otherDevice.id, 1);
    const otherPort = await portRecord(prisma, {
      deviceId: otherDevice.id,
      lockerId: otherLocker.id,
    });
    expect(
      (
        (await ingest(lockerEvent('other-locker', otherLocker.id)))
          .body as IngestResponse
      ).processingStatus,
    ).toBe('failed');
    expect(
      (
        (await ingest(portEvent('other-port', otherPort.id)))
          .body as IngestResponse
      ).processingStatus,
    ).toBe('failed');
    await ingest(
      portEvent('port-admin-fields', port.id, {
        portType: 'wireless',
        powerState: 'on',
      }),
    );
    expect(
      (
        await prisma.charging_ports.findUniqueOrThrow({
          where: { id: port.id },
        })
      ).port_type,
    ).toBe('usb_a');
  });

  it('enforces admin scope, rejects sensitive payloads, and has no delete route', async () => {
    const user = await createUser(prisma, {
      email: 'ingest-admin@example.com',
    });
    await grantPermissions(
      prisma,
      user.id,
      ['device_events.read', 'device_telemetry.read'],
      stationId,
    );
    const cookies = await loginCookies(server, user.email);
    await request(server)
      .get('/api/v1/device-events')
      .set('Cookie', cookies)
      .expect(200);
    await request(server)
      .get('/api/v1/device-telemetry')
      .set('Cookie', cookies)
      .expect(200);
    const latestTelemetry = await prisma.device_telemetry.findFirstOrThrow({
      where: { device_id: deviceId },
      orderBy: { observed_at: 'desc' },
    });
    await request(server)
      .get(`/api/v1/device-telemetry/${latestTelemetry.id}`)
      .set('Cookie', cookies)
      .expect(200);
    await request(server)
      .get(`/api/v1/devices/${deviceId}/telemetry/latest`)
      .set('Cookie', cookies)
      .expect(200);
    const other = await stationRecord(prisma, 'INGEST_SCOPE_OTHER');
    await request(server)
      .get(`/api/v1/device-events?stationId=${other.id}`)
      .set('Cookie', cookies)
      .expect(403);
    await request(server)
      .post('/api/v1/device-ingestion/events')
      .set('Authorization', auth(apiKeyId, apiSecret))
      .send(event('secret', { secret: 'nope' }))
      .expect(400);
    await request(server)
      .delete('/api/v1/device-events/not-a-real-id')
      .set('Cookie', cookies)
      .expect(404);
  });

  function ingest(body: Record<string, unknown>) {
    return request(server)
      .post('/api/v1/device-ingestion/events')
      .set('Authorization', auth(apiKeyId, apiSecret))
      .send(body)
      .expect(201);
  }
});

type IngestResponse = {
  eventId: string;
  duplicate: boolean;
  processingStatus: string;
};

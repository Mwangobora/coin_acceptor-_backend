import { PrismaClient } from '@prisma/client';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import Redis from 'ioredis';
import request from 'supertest';

import { createTestApp } from './auth-test-utils';
import { deviceRecord, stationRecord } from './admin-resource-test-utils';
import {
  apiCredential,
  auth,
  event,
  hmacCredential,
  hmacHeaders,
  telemetry,
} from './device-ingestion-test-utils';

describe('device ingestion', () => {
  let app: INestApplication;
  let server: Server;
  let prisma: PrismaClient;
  let redis: Redis;
  let stationId: string;
  let deviceId: string;
  let apiKeyId: string;
  const apiSecret = 'cak_test_secret';

  beforeAll(async () => {
    ({ app, server, prisma } = await createTestApp());
    redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
    const station = await stationRecord(prisma, 'INGEST_STATION');
    const device = await deviceRecord(
      prisma,
      station.id,
      'INGEST_DEVICE',
      'active',
    );
    stationId = station.id;
    deviceId = device.id;
    apiKeyId = await apiCredential(prisma, deviceId, apiSecret);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    redis.disconnect();
    await app.close();
  });

  it('rejects missing, invalid, revoked, and expired credentials generically', async () => {
    await request(server)
      .post('/api/v1/device-ingestion/events')
      .send(event('missing'))
      .expect(401);
    await request(server)
      .post('/api/v1/device-ingestion/events')
      .set('Authorization', 'DeviceApiKey bad.wrong')
      .send(event('bad'))
      .expect(401)
      .expect(({ body }) =>
        expect(JSON.stringify(body)).not.toContain(apiSecret),
      );
    const revoked = await apiCredential(prisma, deviceId, 'revoked', 'revoked');
    await request(server)
      .post('/api/v1/device-ingestion/events')
      .set('Authorization', auth(revoked, 'revoked'))
      .send(event('revoked'))
      .expect(401);
    const expired = await apiCredential(
      prisma,
      deviceId,
      'expired',
      'active',
      true,
    );
    await request(server)
      .post('/api/v1/device-ingestion/events')
      .set('Authorization', auth(expired, 'expired'))
      .send(event('expired'))
      .expect(401);
  });

  it('authenticates API keys and derives device identity', async () => {
    const response = await request(server)
      .post('/api/v1/device-ingestion/events')
      .set('Authorization', auth(apiKeyId, apiSecret))
      .send({ ...event('api-key'), deviceId: 'ignored' })
      .expect(400);
    expect(JSON.stringify(response.body)).not.toContain(apiSecret);
    const ok = await request(server)
      .post('/api/v1/device-ingestion/events')
      .set('Authorization', auth(apiKeyId, apiSecret))
      .send(event('api-key-ok'))
      .expect(201);
    const okBody = ok.body as IngestResponse;
    const stored = await prisma.device_events.findUniqueOrThrow({
      where: { id: okBody.eventId },
    });
    expect(stored.device_id).toBe(deviceId);
    expect(stored.station_id).toBe(stationId);
  });

  it('authenticates HMAC, rejects altered bodies, old timestamps, and nonce reuse', async () => {
    const secret = 'hmac-test-secret';
    const keyId = await hmacCredential(prisma, deviceId, secret);
    const body = JSON.stringify(event('hmac-ok'));
    await request(server)
      .post('/api/v1/device-ingestion/events')
      .set(hmacHeaders(keyId, secret, body, 'nonce-1'))
      .send(body)
      .expect(201);
    await request(server)
      .post('/api/v1/device-ingestion/events')
      .set(hmacHeaders(keyId, secret, body, 'nonce-1'))
      .send(body)
      .expect(401);
    await request(server)
      .post('/api/v1/device-ingestion/events')
      .set(hmacHeaders(keyId, secret, body, 'nonce-2'))
      .send(JSON.stringify(event('altered')))
      .expect(401);
    await request(server)
      .post('/api/v1/device-ingestion/events')
      .set(
        hmacHeaders(keyId, secret, body, 'nonce-3', '2020-01-01T00:00:00.000Z'),
      )
      .send(body)
      .expect(401);
  });

  it('handles idempotency, conflicts, and processing failures safely', async () => {
    const duplicateEvent = event('dup', {}, 55);
    const first = await request(server)
      .post('/api/v1/device-ingestion/events')
      .set('Authorization', auth(apiKeyId, apiSecret))
      .send(duplicateEvent)
      .expect(201);
    const firstBody = first.body as IngestResponse;
    await request(server)
      .post('/api/v1/device-ingestion/events')
      .set('Authorization', auth(apiKeyId, apiSecret))
      .send(duplicateEvent)
      .expect(({ body }) => {
        const payload = body as IngestResponse;
        expect(payload.eventId).toBe(firstBody.eventId);
        expect(payload.duplicate).toBe(true);
      });
    await request(server)
      .post('/api/v1/device-ingestion/events')
      .set('Authorization', auth(apiKeyId, apiSecret))
      .send({ ...duplicateEvent, payload: { operationalStatus: 'fault' } })
      .expect(409);
    await request(server)
      .post('/api/v1/device-ingestion/events')
      .set('Authorization', auth(apiKeyId, apiSecret))
      .send(event('seq-conflict', {}, 55))
      .expect(409);
    const failed = await request(server)
      .post('/api/v1/device-ingestion/events')
      .set('Authorization', auth(apiKeyId, apiSecret))
      .send(telemetry('bad-telemetry', { batteryPercentage: 120 }))
      .expect(201);
    const failedBody = failed.body as IngestResponse;
    expect(failedBody.processingStatus).toBe('failed');
    await prisma.device_events.findUniqueOrThrow({
      where: { id: failedBody.eventId },
    });
  });
});

type IngestResponse = {
  eventId: string;
  duplicate: boolean;
  processingStatus: string;
};

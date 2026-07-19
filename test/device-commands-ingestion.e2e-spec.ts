import { PrismaClient } from '@prisma/client';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';

import { createTestApp } from './auth-test-utils';
import { deviceRecord, stationRecord } from './admin-resource-test-utils';
import { apiCredential, auth, event } from './device-ingestion-test-utils';

jest.setTimeout(30_000);

describe('device command polling and acknowledgement', () => {
  let app: INestApplication;
  let server: Server;
  let prisma: PrismaClient;
  let stationId: string;
  let deviceId: string;
  let otherDeviceId: string;
  let apiKeyId: string;
  let otherApiKeyId: string;
  const apiSecret = 'command_device_secret';

  beforeAll(async () => {
    ({ app, server, prisma } = await createTestApp());
    const station = await stationRecord(prisma, 'COMMAND_INGEST_STATION');
    const device = await deviceRecord(
      prisma,
      station.id,
      'COMMAND_INGEST_DEVICE',
      'active',
    );
    const other = await deviceRecord(
      prisma,
      station.id,
      'COMMAND_INGEST_OTHER',
      'active',
    );
    stationId = station.id;
    deviceId = device.id;
    otherDeviceId = other.id;
    apiKeyId = await apiCredential(prisma, deviceId, apiSecret);
    otherApiKeyId = await apiCredential(prisma, otherDeviceId, 'other_secret');
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await app?.close();
  });

  it('polls only eligible commands and marks them sent', async () => {
    await request(server).get('/api/v1/device-ingestion/commands').expect(401);
    const ready = await dbCommand('device.status_request', {}, 'queued');
    await dbCommand(
      'device.restart',
      {},
      'queued',
      new Date(Date.now() + 60_000),
    );
    await dbCommand(
      'device.sync_configuration',
      {},
      'queued',
      undefined,
      new Date(Date.now() - 1000),
    );
    await dbCommand(
      'device.status_request',
      {},
      'queued',
      undefined,
      undefined,
      otherDeviceId,
    );
    const response = await request(server)
      .get('/api/v1/device-ingestion/commands')
      .set('Authorization', auth(apiKeyId, apiSecret))
      .expect(200);
    const body = response.body as { commands: BodyId[] };
    expect(body.commands.map((item) => item.id)).toEqual([ready.id]);
    expect(body.commands[0]).not.toHaveProperty('requestedByUserId');
    expect(
      (
        await prisma.device_commands.findUniqueOrThrow({
          where: { id: ready.id },
        })
      ).status,
    ).toBe('sent');
  });

  it('acknowledges commands through device events idempotently', async () => {
    const commandRow = await dbCommand('device.status_request', {}, 'sent');
    const ackEvent = commandAckEvent('ack-1', {
      commandId: commandRow.id,
      result: 'completed',
      response: { ok: true },
    });
    const ack = await sendAck(apiKeyId, apiSecret, ackEvent).expect(201);
    const stored = await prisma.device_commands.findUniqueOrThrow({
      where: { id: commandRow.id },
    });
    expect(stored.status).toBe('completed');
    expect(stored.acknowledgement_event_id).toBe(
      (ack.body as IngestBody).eventId,
    );
    await sendAck(apiKeyId, apiSecret, ackEvent).expect(({ body }) =>
      expect((body as IngestBody).duplicate).toBe(true),
    );
  });

  it('blocks cross-device acknowledgements and impossible transitions', async () => {
    const commandRow = await dbCommand('device.status_request', {}, 'sent');
    await acknowledge(otherApiKeyId, 'other_secret', 'ack-other', {
      commandId: commandRow.id,
      result: 'acknowledged',
      response: {},
    })
      .expect(201)
      .expect(({ body }) =>
        expect((body as IngestBody).processingStatus).toBe('failed'),
      );
    await prisma.device_commands.update({
      where: { id: commandRow.id },
      data: { status: 'completed', completed_at: new Date() },
    });
    await acknowledge(apiKeyId, apiSecret, 'ack-terminal', {
      commandId: commandRow.id,
      result: 'acknowledged',
      response: {},
    })
      .expect(201)
      .expect(({ body }) =>
        expect((body as IngestBody).processingStatus).toBe('failed'),
      );
  });

  function acknowledge(
    keyId: string,
    secret: string,
    id: string,
    payload: Record<string, unknown>,
  ) {
    return sendAck(keyId, secret, commandAckEvent(id, payload));
  }

  function sendAck(
    keyId: string,
    secret: string,
    body: Record<string, unknown>,
  ) {
    return request(server)
      .post('/api/v1/device-ingestion/events')
      .set('Authorization', auth(keyId, secret))
      .send(body);
  }

  function commandAckEvent(id: string, payload: Record<string, unknown>) {
    return {
      ...event(id, payload),
      eventCategory: 'command_ack',
      eventType: 'device.command_ack',
    };
  }

  function dbCommand(
    type: string,
    payload: object,
    status: string,
    availableAt?: Date,
    expiresAt?: Date,
    targetDeviceId = deviceId,
  ) {
    const requestedAt = fixtureRequestedAt(availableAt, expiresAt);
    return prisma.device_commands.create({
      data: {
        station_id: stationId,
        device_id: targetDeviceId,
        command_type: type,
        payload,
        status,
        requested_at: requestedAt,
        available_at: availableAt ?? requestedAt,
        sent_at: status === 'sent' ? new Date() : undefined,
        expires_at: expiresAt,
      },
    });
  }
});

type BodyId = { id: string };
type IngestBody = {
  eventId: string;
  duplicate: boolean;
  processingStatus: string;
};

function fixtureRequestedAt(availableAt?: Date, expiresAt?: Date): Date {
  if (expiresAt) return new Date(expiresAt.getTime() - 1000);
  if (availableAt && availableAt.getTime() > Date.now()) return new Date();
  return availableAt ?? new Date(Date.now() - 1000);
}

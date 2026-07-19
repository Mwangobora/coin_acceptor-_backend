import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import { deviceRecord, stationRecord } from './admin-resource-test-utils';
import {
  createTestApp,
  createUser,
  grantPermissions,
  loginCookies,
} from './auth-test-utils';

const permissions = [
  'device_credentials.read',
  'device_credentials.create',
  'device_credentials.rotate',
  'device_credentials.revoke',
  'device_credentials.force_revoke',
];

describe('Device credential APIs', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let server: Parameters<typeof request>[0];
  let cookies: string;

  beforeAll(async () => {
    ({ app, prisma, server } = await createTestApp());
    const admin = await createUser(prisma, { email: 'cred-admin@example.com' });
    await grantPermissions(prisma, admin.id, permissions);
    cookies = await loginCookies(server, 'cred-admin@example.com');
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('rejects unauthenticated and unauthorized credential reads', async () => {
    await request(server).get('/api/v1/device-credentials').expect(401);
    await createUser(prisma, { email: 'cred-noperms@example.com' });
    const noPermCookies = await loginCookies(
      server,
      'cred-noperms@example.com',
    );
    await request(server)
      .get('/api/v1/device-credentials')
      .set('Cookie', noPermCookies)
      .expect(403);
  });

  it('creates API key and HMAC credentials without exposing stored material', async () => {
    const station = await stationRecord(prisma, 'CRED_STATION_A');
    const device = await deviceRecord(prisma, station.id, 'CRED_DEVICE_A');

    const api = await request(server)
      .post(`/api/v1/devices/${device.id}/credentials`)
      .set('Cookie', cookies)
      .send({ credentialType: 'api_key' })
      .expect(201);
    expect((api.body as { apiKey: string }).apiKey).toMatch(/^cak_/);
    const storedApi = await prisma.device_credentials.findUniqueOrThrow({
      where: { id: (api.body as { id: string }).id },
    });
    expect(storedApi.secret_hash).toContain('argon2');
    expect(storedApi.secret_encrypted).toBeNull();

    const hmac = await request(server)
      .post(`/api/v1/devices/${device.id}/credentials`)
      .set('Cookie', cookies)
      .send({ credentialType: 'hmac' })
      .expect(201);
    expect((hmac.body as { hmacSecret: string }).hmacSecret).toBeDefined();
    const storedHmac = await prisma.device_credentials.findUniqueOrThrow({
      where: { id: (hmac.body as { id: string }).id },
    });
    expect(storedHmac.secret_hash).toBeNull();
    expect(storedHmac.secret_encrypted).toMatch(/^v1:/);

    const list = await request(server)
      .get(`/api/v1/devices/${device.id}/credentials`)
      .set('Cookie', cookies)
      .expect(200);
    expect(JSON.stringify(list.body)).not.toContain('apiKey');
    expect(JSON.stringify(list.body)).not.toContain('secret');
  });

  it('rejects private keys and exposes public key only on credential detail', async () => {
    const station = await stationRecord(prisma, 'CRED_STATION_B');
    const device = await deviceRecord(prisma, station.id, 'CRED_DEVICE_B');

    await request(server)
      .post(`/api/v1/devices/${device.id}/credentials`)
      .set('Cookie', cookies)
      .send({
        credentialType: 'certificate',
        publicKeyPem: '-----BEGIN PRIVATE KEY-----',
      })
      .expect(400);

    const created = await request(server)
      .post(`/api/v1/devices/${device.id}/credentials`)
      .set('Cookie', cookies)
      .send({
        credentialType: 'certificate',
        certificateFingerprint: 'aa:bb:cc',
      })
      .expect(201);
    const credentialId = (created.body as { id: string }).id;
    await request(server)
      .get(`/api/v1/devices/${device.id}/credentials/${credentialId}`)
      .set('Cookie', cookies)
      .expect(200);
  });

  it('rotates credentials, preserves history and revokes idempotently', async () => {
    const station = await stationRecord(prisma, 'CRED_STATION_C');
    const device = await deviceRecord(prisma, station.id, 'CRED_DEVICE_C');
    const created = await request(server)
      .post(`/api/v1/devices/${device.id}/credentials`)
      .set('Cookie', cookies)
      .send({ credentialType: 'api_key' })
      .expect(201);
    const oldId = (created.body as { id: string }).id;

    const rotated = await request(server)
      .post(`/api/v1/devices/${device.id}/credentials/${oldId}/rotate`)
      .set('Cookie', cookies)
      .send({ reason: 'scheduled' })
      .expect(201);
    const newId = (rotated.body as { id: string; apiKey: string }).id;
    expect((rotated.body as { apiKey: string }).apiKey).toMatch(/^cak_/);
    const old = await prisma.device_credentials.findUniqueOrThrow({
      where: { id: oldId },
    });
    const next = await prisma.device_credentials.findUniqueOrThrow({
      where: { id: newId },
    });
    expect(old.status).toBe('revoked');
    expect(next.rotated_from_credential_id).toBe(oldId);

    await request(server)
      .post(`/api/v1/devices/${device.id}/credentials/${oldId}/revoke`)
      .set('Cookie', cookies)
      .send({ reason: 'already revoked' })
      .expect(201);
  });

  it('protects final active credentials and enforces station scope', async () => {
    const station = await stationRecord(prisma, 'CRED_STATION_D');
    const device = await deviceRecord(
      prisma,
      station.id,
      'CRED_DEVICE_D',
      'active',
    );
    const created = await request(server)
      .post(`/api/v1/devices/${device.id}/credentials`)
      .set('Cookie', cookies)
      .send({ credentialType: 'api_key' })
      .expect(201);
    const credentialId = (created.body as { id: string }).id;

    await request(server)
      .post(`/api/v1/devices/${device.id}/credentials/${credentialId}/revoke`)
      .set('Cookie', cookies)
      .send({ reason: 'test' })
      .expect(409);
    await request(server)
      .post(`/api/v1/devices/${device.id}/credentials/${credentialId}/revoke`)
      .set('Cookie', cookies)
      .send({ reason: 'test', force: true })
      .expect(201);

    const scoped = await createUser(prisma, {
      email: 'cred-scoped@example.com',
    });
    await grantPermissions(
      prisma,
      scoped.id,
      ['device_credentials.read'],
      station.id,
    );
    const scopedCookies = await loginCookies(server, 'cred-scoped@example.com');
    await request(server)
      .get(`/api/v1/devices/${device.id}/credentials`)
      .set('Cookie', scopedCookies)
      .expect(200);
    const audit = await prisma.audit_logs.findFirstOrThrow({
      where: { action: 'device_credentials.revoked', entity_id: credentialId },
    });
    expect(JSON.stringify(audit)).not.toContain('cak_');
  });
});

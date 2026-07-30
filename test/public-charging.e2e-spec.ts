import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';

import { PUBLIC_QR_SETTING_KEY } from '../src/apps/public-charging/constants/public-charging.constants';
import {
  deviceRecord,
  lockerRecord,
  packageRecord,
  portRecord,
  settingRecord,
  stationRecord,
} from './admin-resource-test-utils';
import {
  createTestApp,
  createUser,
  grantPermissions,
  loginCookies,
} from './auth-test-utils';
import { hmacCredential } from './device-ingestion-test-utils';

jest.setTimeout(30_000);

describe('public charging flow', () => {
  let app: INestApplication;
  let server: Server;
  let prisma: PrismaClient;
  let qrToken: string;
  const hmacSecret = 'public_device_hmac_secret';

  beforeAll(async () => {
    ({ app, server, prisma } = await createTestApp());
    qrToken = `public_${Date.now()}_opaque`;
    const station = await stationRecord(prisma, 'PUBLIC_CHARGE_STATION');
    const device = await deviceRecord(
      prisma,
      station.id,
      'PUBLIC_DEVICE',
      'active',
    );
    await prisma.devices.update({
      where: { id: device.id },
      data: { connectivity_status: 'online', operational_status: 'idle' },
    });
    const locker = await lockerRecord(prisma, device.id, 1);
    await portRecord(prisma, { deviceId: device.id, lockerId: locker.id });
    await packageRecord(prisma, station.id, 'PUBLIC_PACKAGE', 500);
    await settingRecord(prisma, {
      settingKey: PUBLIC_QR_SETTING_KEY,
      scopeType: 'device',
      stationId: station.id,
      deviceId: device.id,
      valueJson: {
        version: 1,
        hashes: [{ sha256: sha256(qrToken), status: 'active' }],
      },
    });
    await hmacCredential(prisma, device.id, hmacSecret);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await app?.close();
  });

  it('resolves QR publicly without exposing internal IDs', async () => {
    const response = await resolveQr(qrToken).expect(201);
    expect(JSON.stringify(response.body)).not.toContain('device_id');
    expect(JSON.stringify(response.body)).not.toContain('secret');
    expect(response.body).toMatchObject({
      station: { name: 'PUBLIC_CHARGE_STATION' },
      device: { publicCode: 'PUBLIC_DEVICE', connectivityStatus: 'online' },
      availability: { availableLockers: 1, availablePorts: 1 },
    });
    const body = response.body as ResolveBody;
    expect(body.checkoutToken).toEqual(expect.any(String));
  });

  it('uses generic errors for unknown public QR tokens', async () => {
    await resolveQr('public_unknown_opaque').expect(404);
  });

  it('initiates payment from backend package values and returns a flow token', async () => {
    const checkout = (await resolveQr(qrToken)).body as ResolveBody;
    const packages = await request(server)
      .get('/api/v1/public/charging/packages')
      .set('x-checkout-token', checkout.checkoutToken)
      .expect(200);
    expect((packages.body as PackageBody).items[0]).toMatchObject({
      publicPackageId: 'PUBLIC_PACKAGE',
      priceMinor: '500',
      currency: 'TZS',
    });

    const payment = await request(server)
      .post('/api/v1/public/charging/payments')
      .set('x-checkout-token', checkout.checkoutToken)
      .send({ packageId: 'PUBLIC_PACKAGE', idempotencyKey: cryptoUuid() })
      .expect(201);
    const paymentBody = payment.body as PaymentBody;
    expect(paymentBody).toMatchObject({
      amountMinor: '500',
      currency: 'TZS',
      status: 'pending',
    });
    expect(paymentBody.customerFlowToken).toEqual(expect.any(String));
  });

  it('creates a session after confirmation and returns PIN only once', async () => {
    const payment = await createPayment();
    await confirmPayment(payment.paymentReference);
    const status = await request(server)
      .get(
        `/api/v1/public/charging/payments/${payment.paymentReference}/status`,
      )
      .set('x-customer-flow-token', payment.customerFlowToken)
      .expect(200);
    const sessionReference = (status.body as StatusBody).sessionReference;
    expect(sessionReference).toEqual(expect.stringContaining('SESSION-'));
    await expectNoCommandQueuedBeforePinClaim(sessionReference);

    const claim = await request(server)
      .post(`/api/v1/public/charging/sessions/${sessionReference}/access-code`)
      .set('x-customer-flow-token', payment.customerFlowToken)
      .expect(201);
    const accessCode = (claim.body as ClaimBody).accessCode;
    expect(accessCode).toMatch(/^\d{4}$/);
    await request(server)
      .post(`/api/v1/public/charging/sessions/${sessionReference}/access-code`)
      .set('x-customer-flow-token', payment.customerFlowToken)
      .expect(409);

    const session = await prisma.charging_sessions.findUniqueOrThrow({
      where: { session_reference: sessionReference },
    });
    expect(session.access_code_hash).toContain('hmac-sha256:');
    expect(session.access_code_hash).not.toContain(accessCode);
    const command = await prisma.device_commands.findFirstOrThrow({
      where: { command_type: 'charging.prepare' },
    });
    const commandPayload = command.payload as Record<string, unknown>;
    expect(JSON.stringify(command.payload)).toContain('hmac-sha256:');
    expect(JSON.stringify(command.payload)).not.toContain(accessCode);
    expect(commandPayload).not.toHaveProperty('accessCode');
    await expectNoStartCommandForSession(sessionReference);
  });

  it('keeps admin APIs authenticated', async () => {
    await request(server).get('/api/v1/payments').expect(401);
    const user = await createUser(prisma, {
      email: 'public-admin@example.com',
    });
    await grantPermissions(prisma, user.id, ['payments.read']);
    const cookies = await loginCookies(server, user.email);
    await request(server)
      .get('/api/v1/payments')
      .set('Cookie', cookies)
      .expect(200);
  });

  function resolveQr(token: string) {
    return request(server)
      .post('/api/v1/public/charging/qr/resolve')
      .send({ qrToken: token });
  }

  async function createPayment(): Promise<PaymentBody> {
    const checkout = (await resolveQr(qrToken)).body as ResolveBody;
    const response = await request(server)
      .post('/api/v1/public/charging/payments')
      .set('x-checkout-token', checkout.checkoutToken)
      .send({ packageId: 'PUBLIC_PACKAGE', idempotencyKey: cryptoUuid() })
      .expect(201);
    return response.body as PaymentBody;
  }

  async function confirmPayment(reference: string) {
    const qr = await prisma.qr_payment_transactions.findFirstOrThrow({
      where: { payments: { payment_reference: reference } },
    });
    const body = JSON.stringify({
      merchantReference: qr.merchant_reference,
      providerTransactionId: 'public-provider-confirmed',
      status: 'confirmed',
      amountMinor: 500,
      currency: 'TZS',
    });
    await request(server)
      .post('/api/v1/payment-webhooks/mock')
      .set('x-mock-signature', signature(body))
      .send(body)
      .expect(201);
  }

  async function expectNoCommandQueuedBeforePinClaim(reference: string) {
    const commands = await publicSessionCommands(reference);
    expect(commands).toHaveLength(0);
  }

  async function expectNoStartCommandForSession(reference: string) {
    const commands = await publicSessionCommands(reference);
    expect(commands.map((command) => command.command_type)).not.toContain(
      'charging.start',
    );
  }

  async function publicSessionCommands(reference: string) {
    const commands = await prisma.device_commands.findMany({
      where: { command_type: { in: ['charging.prepare', 'charging.start'] } },
    });
    return commands.filter((command) => {
      const payload = command.payload as Record<string, unknown> | null;
      return payload?.sessionReference === reference;
    });
  }

  function signature(body: string) {
    return createHmac('sha256', 'test-mock-webhook-secret')
      .update(Buffer.from(body))
      .digest('hex');
  }
});

type ResolveBody = { checkoutToken: string };
type PackageBody = { items: Array<{ publicPackageId: string }> };
type PaymentBody = { paymentReference: string; customerFlowToken: string };
type StatusBody = { sessionReference: string };
type ClaimBody = { accessCode: string };

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function cryptoUuid(): string {
  return randomUUID();
}

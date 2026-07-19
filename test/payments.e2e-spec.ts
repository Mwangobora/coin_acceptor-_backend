import { PrismaClient } from '@prisma/client';
import type { INestApplication } from '@nestjs/common';
import { createHmac } from 'node:crypto';
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
  packageRecord,
  stationRecord,
} from './admin-resource-test-utils';
import { apiCredential, auth } from './device-ingestion-test-utils';

jest.setTimeout(30_000);

describe('payments', () => {
  let app: INestApplication;
  let server: Server;
  let prisma: PrismaClient;
  let apiKeyId: string;
  let packageId: string;
  let stationId: string;
  const apiSecret = 'payment_api_secret';

  beforeAll(async () => {
    ({ app, server, prisma } = await createTestApp());
    const station = await stationRecord(prisma, 'PAYMENT_STATION');
    const device = await deviceRecord(
      prisma,
      station.id,
      'PAYMENT_DEVICE',
      'active',
    );
    const pkg = await packageRecord(prisma, station.id, 'PAYMENT_PACKAGE');
    stationId = station.id;
    packageId = pkg.id;
    apiKeyId = await apiCredential(prisma, device.id, apiSecret);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await app?.close();
  });

  it('lists packages and confirms coin payments from device events', async () => {
    await request(server)
      .get('/api/v1/device-ingestion/charging-packages')
      .set('Authorization', auth(apiKeyId, apiSecret))
      .expect(({ body }) =>
        expect((body as PackageList).items[0]?.id).toBe(packageId),
      );
    const payment = await createDevicePayment('coin', 'coin-confirm');
    await request(server)
      .post('/api/v1/device-ingestion/events')
      .set('Authorization', auth(apiKeyId, apiSecret))
      .send(coinEvent('coin-ok', payment.paymentReference, 5))
      .expect(({ body }) =>
        expect((body as EventResponse).processingStatus).toBe('processed'),
      );
    await request(server)
      .get(`/api/v1/device-ingestion/payments/${payment.paymentReference}`)
      .set('Authorization', auth(apiKeyId, apiSecret))
      .expect(({ body }) => {
        const response = body as PaymentResponse;
        expect(response.status).toBe('confirmed');
        expect(response.receivedAmountMinor).toBe('500');
      });
  });

  it('records unsupported coin pulses without crediting money', async () => {
    const payment = await createDevicePayment('coin', 'coin-reject');
    await request(server)
      .post('/api/v1/device-ingestion/events')
      .set('Authorization', auth(apiKeyId, apiSecret))
      .send(coinEvent('coin-bad', payment.paymentReference, 9))
      .expect(({ body }) =>
        expect((body as EventResponse).processingStatus).toBe('processed'),
      );
    const insertion = await prisma.coin_insertions.findFirstOrThrow({
      where: { payments: { payment_reference: payment.paymentReference } },
    });
    expect(insertion.accepted).toBe(false);
    expect(insertion.credited_amount_minor).toBe(0n);
  });

  it('confirms QR callbacks and refunds confirmed QR payments', async () => {
    const payment = await createDevicePayment('qr', 'qr-confirm');
    const qr = await prisma.qr_payment_transactions.findUniqueOrThrow({
      where: { payment_id: payment.id },
    });
    const raw = JSON.stringify({
      merchantReference: qr.merchant_reference,
      providerTransactionId: 'provider-confirmed-1',
      status: 'confirmed',
      amountMinor: 500,
      currency: 'TZS',
    });
    await request(server)
      .post('/api/v1/payment-webhooks/mock')
      .set('x-mock-signature', signature(raw))
      .send(raw)
      .expect(({ body }) =>
        expect((body as WebhookResponse).payment.status).toBe('confirmed'),
      );
    const user = await createUser(prisma, {
      email: 'payments-admin@example.com',
    });
    await grantPermissions(prisma, user.id, ['payments.refund'], stationId);
    const cookie = await loginCookies(server, user.email);
    await request(server)
      .post(`/api/v1/payments/${payment.id}/refund`)
      .set('Cookie', cookie)
      .send({ reason: 'customer requested refund' })
      .expect(({ body }) =>
        expect((body as PaymentResponse).status).toBe('refunded'),
      );
  });

  async function createDevicePayment(method: 'coin' | 'qr', key: string) {
    const response = await request(server)
      .post('/api/v1/device-ingestion/payments')
      .set('Authorization', auth(apiKeyId, apiSecret))
      .send({
        chargingPackageId: packageId,
        paymentMethod: method,
        idempotencyKey: key,
      })
      .expect(201);
    return response.body as { id: string; paymentReference: string };
  }
});

type PackageList = { items: Array<{ id: string }> };
type EventResponse = { processingStatus: string };
type PaymentResponse = {
  id: string;
  paymentReference: string;
  status: string;
  receivedAmountMinor?: string;
};
type WebhookResponse = { payment: PaymentResponse };

function coinEvent(id: string, paymentReference: string, pulseCount: number) {
  return {
    externalEventId: id,
    eventCategory: 'payment',
    eventType: 'payment.coin_inserted',
    occurredAt: new Date().toISOString(),
    payload: { paymentReference, pulseCount },
  };
}

function signature(raw: string) {
  return createHmac('sha256', 'test-mock-webhook-secret')
    .update(raw)
    .digest('hex');
}

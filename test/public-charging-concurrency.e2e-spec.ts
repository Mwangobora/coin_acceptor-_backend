import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
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
import { createTestApp } from './auth-test-utils';

jest.setTimeout(30_000);

describe('public charging slot allocation concurrency', () => {
  let app: INestApplication;
  let server: Server;
  let prisma: PrismaClient;
  let qrToken: string;
  let deviceId: string;

  beforeAll(async () => {
    ({ app, server, prisma } = await createTestApp());
    qrToken = `concurrent_${Date.now()}_opaque`;
    const station = await stationRecord(prisma, 'PUBLIC_CONCURRENT_STATION');
    const device = await deviceRecord(
      prisma,
      station.id,
      'PUBLIC_CONCURRENT_DEVICE',
      'active',
    );
    deviceId = device.id;
    const locker = await lockerRecord(prisma, device.id, 1);
    await portRecord(prisma, { deviceId: device.id, lockerId: locker.id });
    await packageRecord(prisma, station.id, 'PUBLIC_CONCURRENT_PACKAGE', 500);
    await settingRecord(prisma, {
      settingKey: PUBLIC_QR_SETTING_KEY,
      scopeType: 'device',
      stationId: station.id,
      deviceId: device.id,
      valueJson: { version: 1, hashes: [{ sha256: sha256(qrToken) }] },
    });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await app?.close();
  });

  it('does not allocate one slot to two confirmed customers', async () => {
    const first = await createPayment();
    const second = await createPayment();

    await Promise.all([
      readPaymentStatus(first),
      readPaymentStatus(second),
    ]);

    const sessions = await prisma.charging_sessions.findMany({
      where: { device_id: deviceId },
    });
    const alerts = await prisma.alerts.findMany({
      where: { alert_code: 'PUBLIC_SLOT_UNAVAILABLE', device_id: deviceId },
    });

    expect(sessions).toHaveLength(1);
    expect(alerts.length).toBeGreaterThanOrEqual(1);
  });

  async function createPayment(): Promise<{
    paymentReference: string;
    customerFlowToken: string;
  }> {
    const checkout = await request(server)
      .post('/api/v1/public/charging/qr/resolve')
      .send({ qrToken })
      .expect(201);
    const response = await request(server)
      .post('/api/v1/public/charging/payments')
      .set(
        'x-checkout-token',
        (checkout.body as { checkoutToken: string }).checkoutToken,
      )
      .send({
        packageId: 'PUBLIC_CONCURRENT_PACKAGE',
        idempotencyKey: randomUUID(),
        paymentMethod: 'mpesa',
      })
      .expect(201);
    return response.body as {
      paymentReference: string;
      customerFlowToken: string;
    };
  }

  async function readPaymentStatus(payment: {
    paymentReference: string;
    customerFlowToken: string;
  }) {
    await request(server)
      .get(
        `/api/v1/public/charging/payments/${payment.paymentReference}/status`,
      )
      .set('x-customer-flow-token', payment.customerFlowToken)
      .expect(200);
  }
});

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

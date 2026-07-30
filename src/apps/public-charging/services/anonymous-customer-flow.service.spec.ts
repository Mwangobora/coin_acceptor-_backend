import { UnauthorizedException } from '@nestjs/common';

import { AnonymousCustomerFlowService } from './anonymous-customer-flow.service';
import { PublicTokenCryptoService } from './public-token-crypto.service';

describe('AnonymousCustomerFlowService', () => {
  it('issues hashed customer flow tokens and binds sessions by payment', async () => {
    const store = memoryStore();
    const service = new AnonymousCustomerFlowService(
      new PublicTokenCryptoService(),
      store as never,
      config(600) as never,
    );

    const issued = await service.issue(flowInput());
    await service.bindSession('PAY-1', 'SESSION-1');

    await expect(
      service.require(issued.customerFlowToken),
    ).resolves.toMatchObject({
      paymentReference: 'PAY-1',
      sessionReference: 'SESSION-1',
    });
    expect([...store.values()].join(' ')).not.toContain(
      issued.customerFlowToken,
    );
  });

  it('rejects missing, expired and revoked flow tokens', async () => {
    const crypto = new PublicTokenCryptoService();
    const store = memoryStore();
    const service = new AnonymousCustomerFlowService(
      crypto,
      store as never,
      config(600) as never,
    );
    await setFlow(store, crypto, 'expired', {
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    await setFlow(store, crypto, 'revoked', {
      revokedAt: new Date().toISOString(),
    });

    await expect(service.require('missing')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(service.require('expired')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(service.require('revoked')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

function flowInput() {
  return {
    checkoutHash: 'checkout-hash',
    stationId: 'station-1',
    deviceId: 'device-1',
    paymentId: 'payment-1',
    paymentReference: 'PAY-1',
  };
}

async function setFlow(
  store: ReturnType<typeof memoryStore>,
  crypto: PublicTokenCryptoService,
  token: string,
  overrides: object,
) {
  const flowHash = crypto.hash(token);
  await store.setJson(`public:flow:${flowHash}`, {
    ...flowInput(),
    flowHash,
    expiresAt: new Date(Date.now() + 600_000).toISOString(),
    ...overrides,
  });
}

function memoryStore() {
  const values = new Map<string, string>();
  return Object.assign(values, {
    setJson: jest.fn((key: string, value: object) => {
      values.set(key, JSON.stringify(value));
      return Promise.resolve();
    }),
    getJson: jest.fn((key: string) => {
      const raw = values.get(key);
      return Promise.resolve(raw ? JSON.parse(raw) : null);
    }),
  });
}

function config(ttl: number) {
  return { get: jest.fn().mockReturnValue(ttl) };
}

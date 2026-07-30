import { UnauthorizedException } from '@nestjs/common';

import { AnonymousCheckoutService } from './anonymous-checkout.service';
import { PublicTokenCryptoService } from './public-token-crypto.service';

describe('AnonymousCheckoutService', () => {
  it('issues and requires hashed checkout token records', async () => {
    const store = memoryStore();
    const service = new AnonymousCheckoutService(
      new PublicTokenCryptoService(),
      store as never,
      config(600) as never,
    );

    const issued = await service.issue({
      stationId: 'station-1',
      deviceId: 'device-1',
    });

    await expect(service.require(issued.checkoutToken)).resolves.toMatchObject({
      stationId: 'station-1',
      deviceId: 'device-1',
    });
    expect([...store.values()][0]).not.toContain(issued.checkoutToken);
  });

  it('rejects missing or expired checkout tokens generically', async () => {
    const crypto = new PublicTokenCryptoService();
    const store = memoryStore();
    const service = new AnonymousCheckoutService(
      crypto,
      store as never,
      config(600) as never,
    );
    await store.setJson(`public:checkout:${crypto.hash('expired')}`, {
      checkoutHash: crypto.hash('expired'),
      stationId: 'station-1',
      deviceId: 'device-1',
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });

    await expect(service.require('missing')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(service.require('expired')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

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

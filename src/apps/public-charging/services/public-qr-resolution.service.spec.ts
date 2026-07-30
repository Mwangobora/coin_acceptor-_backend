import { NotFoundException } from '@nestjs/common';

import { PublicQrResolutionService } from './public-qr-resolution.service';
import { PublicTokenCryptoService } from './public-token-crypto.service';

describe('PublicQrResolutionService', () => {
  it('resolves rotated public QR token hashes without exposing internals', async () => {
    const crypto = new PublicTokenCryptoService();
    const service = serviceWith(crypto, [
      {
        device_id: 'device-1',
        station_id: 'station-1',
        value_json: {
          version: 1,
          hashes: [
            { sha256: crypto.hash('old-token'), status: 'rotated' },
            { sha256: crypto.hash('public-token-123456'), status: 'active' },
          ],
        },
      },
    ]);

    await expect(
      service.resolve(' public-token-123456 '),
    ).resolves.toMatchObject({
      station: { name: 'Central Station' },
      device: {
        publicCode: 'DEVICE-01',
        status: 'available',
        connectivityStatus: 'online',
      },
      availability: { availableLockers: 1, availablePorts: 1 },
      checkoutToken: 'checkout-token',
    });
  });

  it('rejects unknown tokens generically and records safe audit events', async () => {
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const service = serviceWith(new PublicTokenCryptoService(), [], audit);

    await expect(
      service.resolve('missing-public-token'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'public_qr.invalid' }),
    );
  });
});

function serviceWith(
  crypto: PublicTokenCryptoService,
  settings: unknown[],
  audit = { record: jest.fn().mockResolvedValue(undefined) },
) {
  const prisma = {
    system_settings: { findMany: jest.fn().mockResolvedValue(settings) },
    devices: { findFirstOrThrow: jest.fn().mockResolvedValue(deviceRow()) },
    lockers: { count: jest.fn().mockResolvedValue(1) },
    charging_ports: { count: jest.fn().mockResolvedValue(1) },
    $transaction: jest.fn((queries: Array<Promise<number>>) =>
      Promise.all(queries),
    ),
  };
  return new PublicQrResolutionService(
    prisma as never,
    crypto,
    { issue: jest.fn().mockResolvedValue(checkoutRow()) } as never,
    { listForDevice: jest.fn().mockResolvedValue({ items: [] }) } as never,
    audit as never,
  );
}

function deviceRow() {
  return {
    id: 'device-1',
    station_id: 'station-1',
    device_code: 'DEVICE-01',
    name: 'Smart Charger',
    operational_status: 'idle',
    connectivity_status: 'online',
    stations: {
      name: 'Central Station',
      region: 'Dar es Salaam',
      district: 'Kinondoni',
    },
  };
}

function checkoutRow() {
  return {
    checkoutToken: 'checkout-token',
    expiresAt: new Date(Date.now() + 600_000),
  };
}

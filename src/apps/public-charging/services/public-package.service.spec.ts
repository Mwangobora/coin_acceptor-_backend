import { NotFoundException } from '@nestjs/common';

import { PublicPackageService } from './public-package.service';

describe('PublicPackageService', () => {
  it('maps only safe public package fields', async () => {
    const service = serviceWith([packageRow()]);

    await expect(service.listForDevice('station-1')).resolves.toEqual({
      items: [
        expect.objectContaining({
          publicPackageId: 'PKG_500',
          priceMinor: '500',
          currency: 'TZS',
        }),
      ],
    });
  });

  it('requires selected packages from the backend', async () => {
    await expect(
      serviceWith([packageRow()]).requireForPayment({
        publicPackageId: 'PKG_500',
        stationId: 'station-1',
      }),
    ).resolves.toMatchObject({ code: 'PKG_500' });
    await expect(
      serviceWith([]).requireForPayment({
        publicPackageId: 'MISSING',
        stationId: 'station-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

function serviceWith(rows: unknown[]) {
  const prisma = {
    charging_packages: {
      findMany: jest.fn().mockResolvedValue(rows),
      findFirst: jest.fn().mockResolvedValue(rows[0] ?? null),
    },
  };
  return new PublicPackageService(prisma as never);
}

function packageRow() {
  return {
    code: 'PKG_500',
    name: 'Demo Package',
    description: 'Demo',
    price_minor: 500n,
    currency: 'TZS',
    duration_seconds: 120,
    display_order: 1,
  };
}

import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import type { AuthenticatedDevice } from '../../device-ingestion/types/authenticated-device.type';
import { mapPackage } from '../mappers/payment.mapper';

@Injectable()
export class ChargingPackageReadService {
  constructor(private readonly prisma: PrismaService) {}

  async listAvailable(auth: AuthenticatedDevice) {
    const packages = await this.prisma.charging_packages.findMany({
      where: availableWhere(auth.stationId),
      orderBy: [{ display_order: 'asc' }, { price_minor: 'asc' }],
    });
    return { items: packages.map(mapPackage) };
  }

  async requireAvailable(packageId: string, stationId: string, method: string) {
    const pkg = await this.prisma.charging_packages.findFirst({
      where: {
        id: packageId,
        ...availableWhere(stationId),
        ...(method === 'coin' ? { allow_coin: true } : { allow_qr: true }),
      },
    });
    if (!pkg) throw new BadRequestException('Charging package is unavailable.');
    return pkg;
  }
}

function availableWhere(stationId: string) {
  const now = new Date();
  return {
    status: 'active',
    valid_from: { lte: now },
    AND: [
      { OR: [{ station_id: null }, { station_id: stationId }] },
      { OR: [{ valid_until: null }, { valid_until: { gt: now } }] },
      { OR: [{ allow_coin: true }, { allow_qr: true }] },
    ],
  };
}

import { Injectable, NotFoundException } from '@nestjs/common';
import type { charging_packages } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { mapPublicPackage } from '../mappers/public-package.mapper';

@Injectable()
export class PublicPackageService {
  constructor(private readonly prisma: PrismaService) {}

  async listForDevice(stationId: string) {
    const packages = await this.prisma.charging_packages.findMany({
      where: availablePackageWhere(stationId),
      orderBy: [{ display_order: 'asc' }, { price_minor: 'asc' }],
    });
    return { items: packages.map(mapPublicPackage) };
  }

  async requireForPayment(input: {
    publicPackageId: string;
    stationId: string;
  }): Promise<charging_packages> {
    const pkg = await this.prisma.charging_packages.findFirst({
      where: {
        code: input.publicPackageId,
        ...availablePackageWhere(input.stationId),
      },
    });
    if (!pkg) {
      throw new NotFoundException('Public charging resource not found.');
    }
    return pkg;
  }
}

export function availablePackageWhere(stationId: string) {
  const now = new Date();
  return {
    status: 'active',
    allow_qr: true,
    currency: 'TZS',
    valid_from: { lte: now },
    AND: [
      { OR: [{ station_id: null }, { station_id: stationId }] },
      { OR: [{ valid_until: null }, { valid_until: { gt: now } }] },
    ],
  };
}

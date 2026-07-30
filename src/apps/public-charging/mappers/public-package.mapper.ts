import type { charging_packages } from '@prisma/client';

import type { PublicPackage } from '../types/public-token.type';

export function mapPublicPackage(row: charging_packages): PublicPackage {
  return {
    publicPackageId: row.code,
    name: row.name,
    description: row.description,
    priceMinor: row.price_minor.toString(),
    currency: row.currency,
    durationSeconds: row.duration_seconds,
    displayOrder: row.display_order,
  };
}

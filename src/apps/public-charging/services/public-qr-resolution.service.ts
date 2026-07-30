import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PrismaService } from '../../../database/prisma.service';
import { PUBLIC_QR_SETTING_KEY } from '../constants/public-charging.constants';
import { PublicTokenCryptoService } from './public-token-crypto.service';
import { AnonymousCheckoutService } from './anonymous-checkout.service';
import { PublicPackageService } from './public-package.service';

@Injectable()
export class PublicQrResolutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: PublicTokenCryptoService,
    private readonly checkout: AnonymousCheckoutService,
    private readonly packages: PublicPackageService,
    private readonly audit: AuditLogsService,
  ) {}

  async resolve(qrToken: string) {
    const tokenHash = this.crypto.hash(this.normalizeToken(qrToken));
    const setting = await this.findMatchingSetting(tokenHash);
    if (!setting?.device_id || !setting.station_id) {
      await this.auditSafe('public_qr.invalid');
      throw this.notFound();
    }
    const device = await this.requirePublicDevice(setting.device_id);
    const availability = await this.availability(device.id);
    const checkout = await this.checkout.issue({
      stationId: device.station_id,
      deviceId: device.id,
    });
    await this.auditSafe('public_qr.resolved', device.station_id);
    return {
      station: {
        name: device.stations.name,
        region: device.stations.region,
        district: device.stations.district,
      },
      device: {
        publicCode: device.device_code,
        name: device.name,
        status: publicDeviceStatus(device.operational_status, availability),
        connectivityStatus: device.connectivity_status,
      },
      availability,
      packages: (await this.packages.listForDevice(device.station_id)).items,
      checkoutToken: checkout.checkoutToken,
      expiresAt: checkout.expiresAt,
    };
  }

  normalizeToken(value: string): string {
    const normalized = this.crypto.normalize(value);
    if (!/^[A-Za-z0-9_-]{16,256}$/.test(normalized)) throw this.notFound();
    return normalized;
  }

  private async findMatchingSetting(tokenHash: string) {
    const settings = await this.prisma.system_settings.findMany({
      where: {
        setting_key: PUBLIC_QR_SETTING_KEY,
        scope_type: 'device',
        status: 'active',
      },
    });
    return settings.find((setting) =>
      activeHashes(setting.value_json).some((hash) =>
        this.crypto.safeEqual(hash, tokenHash),
      ),
    );
  }

  private requirePublicDevice(deviceId: string) {
    return this.prisma.devices
      .findFirstOrThrow({
        where: {
          id: deviceId,
          lifecycle_status: 'active',
          stations: { status: 'active' },
        },
        include: { stations: true },
      })
      .catch(() => {
        throw this.notFound();
      });
  }

  private async availability(deviceId: string) {
    const [availableLockers, availablePorts] = await this.prisma.$transaction([
      this.prisma.lockers.count({
        where: { device_id: deviceId, availability_status: 'available' },
      }),
      this.prisma.charging_ports.count({
        where: { device_id: deviceId, status: 'available' },
      }),
    ]);
    return { availableLockers, availablePorts };
  }

  private async auditSafe(action: string, stationId?: string) {
    await this.audit.record({
      action,
      entityType: 'public_charging_flow',
      stationId,
    });
  }

  private notFound(): NotFoundException {
    return new NotFoundException('Public charging resource not found.');
  }
}

function activeHashes(value: Prisma.JsonValue): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  const input = value as Record<string, unknown>;
  const hashes = input.hashes ?? input.tokenHashes;
  if (!Array.isArray(hashes)) return [];
  const now = new Date();
  return hashes
    .filter((item): item is Record<string, unknown> => isActive(item, now))
    .map((item) => item.sha256)
    .filter((hash): hash is string => typeof hash === 'string');
}

function isActive(value: unknown, now: Date): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const status = (value as Record<string, unknown>).status ?? 'active';
  const expiresAt = (value as Record<string, unknown>).expiresAt;
  return (
    status === 'active' &&
    (typeof expiresAt !== 'string' || Date.parse(expiresAt) > +now)
  );
}

function publicDeviceStatus(
  operationalStatus: string,
  availability: { availableLockers: number; availablePorts: number },
) {
  if (!availability.availableLockers || !availability.availablePorts)
    return 'busy';
  if (['maintenance', 'fault'].includes(operationalStatus))
    return 'maintenance';
  return 'available';
}

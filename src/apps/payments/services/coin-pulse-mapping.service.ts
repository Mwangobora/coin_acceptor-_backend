import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../../database/prisma.service';

const SETTING_KEY = 'payments.coin_pulse_mapping';

@Injectable()
export class CoinPulseMappingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async denominationFor(input: {
    stationId: string;
    deviceId: string;
    pulseCount: number;
  }): Promise<bigint | null> {
    const mapping = await this.mapping(input.stationId, input.deviceId);
    return mapping.get(input.pulseCount) ?? null;
  }

  private async mapping(stationId: string, deviceId: string) {
    const settings = await this.prisma.system_settings.findMany({
      where: {
        setting_key: SETTING_KEY,
        status: 'active',
        OR: [
          { scope_type: 'device', device_id: deviceId, station_id: stationId },
          { scope_type: 'station', station_id: stationId },
          { scope_type: 'global' },
        ],
      },
      orderBy: { updated_at: 'desc' },
    });
    const setting =
      settings.find((item) => item.scope_type === 'device') ??
      settings.find((item) => item.scope_type === 'station') ??
      settings.find((item) => item.scope_type === 'global');
    return parseMapping(
      setting?.value_json ??
        JSON.parse(
          this.config.getOrThrow<string>('security.coinPulseMappingJson'),
        ),
    );
  }
}

function parseMapping(value: unknown): Map<number, bigint> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Coin pulse mapping must be an object.');
  }
  const mapping = new Map<number, bigint>();
  for (const [pulse, amount] of Object.entries(value)) {
    const pulseNumber = Number(pulse);
    const amountNumber = Number(amount);
    if (
      !Number.isInteger(pulseNumber) ||
      pulseNumber < 1 ||
      !Number.isInteger(amountNumber) ||
      amountNumber < 1
    ) {
      throw new BadRequestException(
        'Coin pulse mapping contains invalid values.',
      );
    }
    mapping.set(pulseNumber, BigInt(amountNumber));
  }
  return mapping;
}

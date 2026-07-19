import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../../database/prisma.service';
import { mapPollCommand } from '../mappers/device-command.mapper';
import type { AuthenticatedDevice } from '../../device-ingestion/types/authenticated-device.type';

type IdRow = { id: string };

@Injectable()
export class CommandPollingService {
  private readonly limit: number;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.limit = config.get<number>('security.deviceCommandPollLimit') ?? 10;
  }

  async poll(auth: AuthenticatedDevice) {
    const commands = await this.prisma.$transaction(async (tx) => {
      const ids = await tx.$queryRaw<IdRow[]>`
        SELECT id
        FROM device_commands
        WHERE device_id = ${auth.deviceId}::uuid
          AND status = 'queued'
          AND available_at <= CURRENT_TIMESTAMP
          AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        ORDER BY requested_at ASC, id ASC
        LIMIT ${this.limit}
        FOR UPDATE SKIP LOCKED
      `;
      if (!ids.length) return [];
      const idList = ids.map((item) => item.id);
      await tx.device_commands.updateMany({
        where: {
          id: { in: idList },
          device_id: auth.deviceId,
          status: 'queued',
        },
        data: { status: 'sent', sent_at: new Date() },
      });
      return tx.device_commands.findMany({
        where: { id: { in: idList }, device_id: auth.deviceId, status: 'sent' },
        orderBy: [{ requested_at: 'asc' }, { id: 'asc' }],
      });
    });
    return { commands: commands.map(mapPollCommand) };
  }
}

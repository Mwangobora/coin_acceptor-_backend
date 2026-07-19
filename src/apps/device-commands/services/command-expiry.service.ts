import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../../database/prisma.service';

type IdRow = { id: string };

@Injectable()
export class CommandExpiryService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private readonly intervalSeconds: number;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.intervalSeconds =
      config.get<number>('security.deviceCommandExpiryIntervalSeconds') ?? 60;
  }

  onModuleInit(): void {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(
      () => void this.expireBatch(),
      this.intervalSeconds * 1000,
    );
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async expireBatch(limit = 100): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const ids = await tx.$queryRaw<IdRow[]>`
        SELECT id
        FROM device_commands
        WHERE status IN ('queued', 'sent')
          AND expires_at IS NOT NULL
          AND expires_at <= CURRENT_TIMESTAMP
        ORDER BY expires_at ASC, id ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      `;
      if (!ids.length) return 0;
      const result = await tx.device_commands.updateMany({
        where: { id: { in: ids.map((item) => item.id) } },
        data: { status: 'expired', failure_reason: 'Command expired.' },
      });
      return result.count;
    });
  }
}

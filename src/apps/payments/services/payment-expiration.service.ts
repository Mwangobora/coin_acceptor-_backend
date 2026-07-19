import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class PaymentExpirationService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditLogsService,
  ) {}

  onModuleInit(): void {
    if (this.config.get<string>('app.nodeEnv') === 'test') return;
    this.timer = setInterval(() => void this.expireBatch(), 60_000);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async expireBatch(limit = 100): Promise<number> {
    const now = new Date();
    const pendingCutoff = new Date(
      Date.now() -
        this.config.getOrThrow<number>('security.paymentPendingWindowSeconds') *
          1000,
    );
    const candidates = await this.prisma.payments.findMany({
      where: {
        status: { in: ['pending', 'processing'] },
        OR: [
          { payment_method: 'coin', initiated_at: { lte: pendingCutoff } },
          {
            payment_method: 'qr',
            qr_payment_transactions: { qr_expires_at: { lte: now } },
          },
        ],
      },
      take: limit,
      select: { id: true, station_id: true },
    });
    if (!candidates.length) return 0;
    await this.prisma.$transaction(async (tx) => {
      const ids = candidates.map((item) => item.id);
      await tx.qr_payment_transactions.updateMany({
        where: {
          payment_id: { in: ids },
          provider_status: { in: ['created', 'pending'] },
        },
        data: { provider_status: 'expired', failed_at: now },
      });
      await tx.payments.updateMany({
        where: { id: { in: ids }, status: { in: ['pending', 'processing'] } },
        data: { status: 'expired', expired_at: now },
      });
      for (const item of candidates) {
        await this.audit.record(
          {
            action: 'payments.expired',
            entityType: 'payments',
            entityId: item.id,
            stationId: item.station_id,
          },
          tx,
        );
      }
    });
    return candidates.length;
  }
}

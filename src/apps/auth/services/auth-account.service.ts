import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PrismaService } from '../../../database/prisma.service';
import type { RequestMetadata } from '../types/auth-request.type';

@Injectable()
export class AuthAccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditLogsService,
  ) {}

  isLocked(lockedUntil: Date | null): boolean {
    return Boolean(lockedUntil && lockedUntil > new Date());
  }

  async registerFailedLogin(
    userId: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    const maxAttempts = this.config.getOrThrow<number>(
      'security.authMaxFailedAttempts',
    );
    const lockMinutes = this.config.getOrThrow<number>(
      'security.authLockMinutes',
    );
    const user = await this.prisma.users.update({
      where: { id: userId },
      data: { failed_login_attempts: { increment: 1 } },
    });
    if (user.failed_login_attempts < maxAttempts) return;

    await this.prisma.users.update({
      where: { id: userId },
      data: { locked_until: new Date(Date.now() + lockMinutes * 60_000) },
    });
    await this.audit.record({
      actorUserId: userId,
      action: 'auth.account_locked',
      entityType: 'users',
      entityId: userId,
      ...metadata,
    });
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../../../database/prisma.service';
import { RefreshTokenReuseError } from '../types/auth-errors.type';
import type { RequestMetadata } from '../types/auth-request.type';
import type { RefreshTokenPayload } from '../types/jwt-payload.type';
import { PasswordService } from './password.service';

type Tx = Prisma.TransactionClient;

@Injectable()
export class AuthSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
  ) {}

  async createSession(input: {
    userId: string;
    refreshToken: string;
    expiresAt: Date;
    metadata: RequestMetadata;
    tokenFamilyId?: string;
    rotatedFromSessionId?: string;
    sessionId?: string;
  }) {
    return this.prisma.auth_sessions.create({
      data: {
        id: input.sessionId ?? randomUUID(),
        user_id: input.userId,
        token_family_id: input.tokenFamilyId ?? randomUUID(),
        rotated_from_session_id: input.rotatedFromSessionId,
        refresh_token_hash: await this.passwords.hash(input.refreshToken),
        ip_address: input.metadata.ipAddress,
        user_agent: input.metadata.userAgent,
        expires_at: input.expiresAt,
      },
    });
  }

  async rotateSession(input: {
    payload: RefreshTokenPayload;
    oldRefreshToken: string;
    newRefreshToken: string;
    newSessionId: string;
    expiresAt: Date;
    metadata: RequestMetadata;
  }) {
    const now = new Date();
    const old = await this.prisma.auth_sessions.findUnique({
      where: { id: input.payload.sessionId },
      include: { users: true },
    });

    if (!old || old.user_id !== input.payload.sub)
      throw new UnauthorizedException();
    if (old.token_family_id !== input.payload.tokenFamilyId) {
      throw new UnauthorizedException();
    }
    if (
      old.users.status !== 'active' ||
      this.isLocked(old.users.locked_until)
    ) {
      throw new UnauthorizedException();
    }
    if (old.revoked_at) return this.handleRevokedRefresh(old);
    if (old.expires_at <= now) throw new UnauthorizedException();
    if (
      !(await this.passwords.verify(
        old.refresh_token_hash,
        input.oldRefreshToken,
      ))
    ) {
      throw new UnauthorizedException();
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.auth_sessions.update({
        where: { id: old.id },
        data: { revoked_at: now, revoke_reason: 'rotated', last_used_at: now },
      });
      return this.createSessionWithTx(tx, {
        userId: old.user_id,
        refreshToken: input.newRefreshToken,
        expiresAt: input.expiresAt,
        metadata: input.metadata,
        tokenFamilyId: old.token_family_id,
        rotatedFromSessionId: old.id,
        sessionId: input.newSessionId,
      });
    });
  }

  async revokeSession(sessionId: string, reason: string): Promise<void> {
    await this.prisma.auth_sessions.updateMany({
      where: { id: sessionId, revoked_at: null },
      data: { revoked_at: new Date(), revoke_reason: reason },
    });
  }

  async revokeUserSessions(userId: string, reason: string): Promise<void> {
    await this.prisma.auth_sessions.updateMany({
      where: { user_id: userId, revoked_at: null },
      data: { revoked_at: new Date(), revoke_reason: reason },
    });
  }

  async revokeOwnSession(userId: string, sessionId: string): Promise<boolean> {
    const result = await this.prisma.auth_sessions.updateMany({
      where: { id: sessionId, user_id: userId, revoked_at: null },
      data: { revoked_at: new Date(), revoke_reason: 'user_revoked' },
    });
    return result.count > 0;
  }

  async listUserSessions(userId: string) {
    return this.prisma.auth_sessions.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
  }

  private async handleRevokedRefresh(old: {
    id: string;
    user_id: string;
    token_family_id: string;
    revoke_reason: string | null;
  }): Promise<never> {
    if (old.revoke_reason === 'rotated') {
      await this.revokeFamily(old.token_family_id, 'refresh_reuse_detected');
      throw new RefreshTokenReuseError(
        old.user_id,
        old.token_family_id,
        old.id,
      );
    }
    throw new UnauthorizedException();
  }

  private async revokeFamily(
    tokenFamilyId: string,
    reason: string,
  ): Promise<void> {
    await this.prisma.auth_sessions.updateMany({
      where: { token_family_id: tokenFamilyId, revoked_at: null },
      data: { revoked_at: new Date(), revoke_reason: reason },
    });
  }

  private isLocked(lockedUntil: Date | null): boolean {
    return Boolean(lockedUntil && lockedUntil > new Date());
  }

  private async createSessionWithTx(
    tx: Tx,
    input: Parameters<AuthSessionService['createSession']>[0],
  ) {
    return tx.auth_sessions.create({
      data: {
        id: input.sessionId ?? randomUUID(),
        user_id: input.userId,
        token_family_id: input.tokenFamilyId ?? randomUUID(),
        rotated_from_session_id: input.rotatedFromSessionId,
        refresh_token_hash: await this.passwords.hash(input.refreshToken),
        ip_address: input.metadata.ipAddress,
        user_agent: input.metadata.userAgent,
        expires_at: input.expiresAt,
      },
      include: { users: true },
    });
  }
}

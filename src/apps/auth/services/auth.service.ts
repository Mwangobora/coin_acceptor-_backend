import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../../../database/prisma.service';
import { INVALID_CREDENTIALS_MESSAGE } from '../constants/auth.constants';
import { mapSafeUser, mapSession } from '../mappers/auth-response.mapper';
import { RefreshTokenReuseError } from '../types/auth-errors.type';
import type {
  AuthMessageResponse,
  AuthSessionResponse,
  AuthSuccessResponse,
} from '../types/auth-responses.type';
import type { AuthenticatedUser } from '../types/authenticated-user.type';
import type { RequestMetadata } from '../types/auth-request.type';
import { AuthAccountService } from './auth-account.service';
import { AuthAuditService } from './auth-audit.service';
import { AuthSessionService } from './auth-session.service';
import { AuthTtlService } from './auth-ttl.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly ttl: AuthTtlService,
    private readonly sessions: AuthSessionService,
    private readonly accounts: AuthAccountService,
    private readonly audit: AuthAuditService,
  ) {}

  async login(email: string, password: string, metadata: RequestMetadata) {
    const user = await this.prisma.users.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user) throw this.invalidCredentials();
    if (user.status !== 'active' || this.accounts.isLocked(user.locked_until)) {
      await this.accounts.registerFailedLogin(user.id, metadata);
      throw this.invalidCredentials();
    }
    if (!(await this.passwords.verify(user.password_hash, password))) {
      await this.accounts.registerFailedLogin(user.id, metadata);
      throw this.invalidCredentials();
    }

    const updatedUser = await this.prisma.users.update({
      where: { id: user.id },
      data: {
        failed_login_attempts: 0,
        locked_until: null,
        last_login_at: new Date(),
      },
    });
    const auth = await this.createAuthSession(updatedUser.id, metadata);
    await this.audit.login(updatedUser.id, auth.sessionId, metadata);
    return { ...auth, body: { user: mapSafeUser(updatedUser) } };
  }

  async refresh(rawRefreshToken: string, metadata: RequestMetadata) {
    const payload = await this.tokens.verifyRefresh(rawRefreshToken);
    const newSessionId = randomUUID();
    const newRefreshToken = await this.tokens.signRefresh({
      userId: payload.sub,
      sessionId: newSessionId,
      tokenFamilyId: payload.tokenFamilyId,
    });
    try {
      const session = await this.sessions.rotateSession({
        payload,
        oldRefreshToken: rawRefreshToken,
        newRefreshToken,
        newSessionId,
        expiresAt: this.refreshExpiresAt(),
        metadata,
      });
      const accessToken = await this.tokens.signAccess(payload.sub, session.id);
      return {
        sessionId: session.id,
        accessToken,
        refreshToken: newRefreshToken,
        body: { user: mapSafeUser(session.users) },
      };
    } catch (error) {
      if (error instanceof RefreshTokenReuseError) {
        await this.audit.refreshReuse(error, metadata);
      }
      throw error;
    }
  }

  async logout(rawRefreshToken: string | undefined, metadata: RequestMetadata) {
    if (rawRefreshToken) {
      await this.revokeRefreshTokenIfValid(rawRefreshToken, metadata);
    }
    return { message: 'Logged out.' };
  }

  async logoutAll(user: AuthenticatedUser, metadata: RequestMetadata) {
    await this.sessions.revokeUserSessions(user.id, 'logout_all');
    await this.audit.logoutAll(user.id, metadata);
    return { message: 'Logged out from all sessions.' };
  }

  me(user: AuthenticatedUser): AuthSuccessResponse {
    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        status: user.status,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  async changePassword(
    user: AuthenticatedUser,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
    metadata: RequestMetadata,
  ): Promise<AuthMessageResponse> {
    this.passwords.validateNewPassword(newPassword, confirmPassword);
    const dbUser = await this.prisma.users.findUniqueOrThrow({
      where: { id: user.id },
    });
    if (!(await this.passwords.verify(dbUser.password_hash, currentPassword))) {
      throw new UnauthorizedException('Current password is incorrect.');
    }
    if (await this.passwords.verify(dbUser.password_hash, newPassword)) {
      throw new BadRequestException('New password must be different.');
    }
    await this.prisma.users.update({
      where: { id: user.id },
      data: {
        password_hash: await this.passwords.hash(newPassword),
        must_change_password: false,
      },
    });
    await this.sessions.revokeUserSessions(user.id, 'password_changed');
    await this.audit.passwordChanged(user.id, metadata);
    return { message: 'Password changed. Please log in again.' };
  }

  async listSessions(user: AuthenticatedUser): Promise<AuthSessionResponse[]> {
    const sessions = await this.sessions.listUserSessions(user.id);
    return sessions.map((session) => mapSession(session, user.sessionId));
  }

  async revokeSession(
    user: AuthenticatedUser,
    sessionId: string,
    metadata: RequestMetadata,
  ) {
    const revoked = await this.sessions.revokeOwnSession(user.id, sessionId);
    if (revoked) {
      await this.audit.sessionRevoked(user.id, sessionId, metadata);
    }
    return { message: 'Session revoked.' };
  }

  private async createAuthSession(userId: string, metadata: RequestMetadata) {
    const sessionId = randomUUID();
    const tokenFamilyId = randomUUID();
    const refreshToken = await this.tokens.signRefresh({
      userId,
      sessionId,
      tokenFamilyId,
    });
    const session = await this.sessions.createSession({
      userId,
      sessionId,
      tokenFamilyId,
      refreshToken,
      expiresAt: this.refreshExpiresAt(),
      metadata,
    });
    const accessToken = await this.tokens.signAccess(userId, session.id);
    return { sessionId: session.id, accessToken, refreshToken };
  }

  private async revokeRefreshTokenIfValid(
    token: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    try {
      const payload = await this.tokens.verifyRefresh(token);
      await this.sessions.revokeSession(payload.sessionId, 'logout');
      await this.audit.logout(payload.sub, payload.sessionId, metadata);
    } catch {
      return;
    }
  }

  private refreshExpiresAt(): Date {
    return this.ttl.expiresAt(
      this.config.getOrThrow<string>('security.jwtRefreshTtl'),
    );
  }

  private invalidCredentials(): UnauthorizedException {
    return new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
  }
}

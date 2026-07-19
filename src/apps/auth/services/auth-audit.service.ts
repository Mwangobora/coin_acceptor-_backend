import { Injectable } from '@nestjs/common';

import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { RefreshTokenReuseError } from '../types/auth-errors.type';
import type { RequestMetadata } from '../types/auth-request.type';

@Injectable()
export class AuthAuditService {
  constructor(private readonly audit: AuditLogsService) {}

  login(userId: string, sessionId: string, metadata: RequestMetadata) {
    return this.audit.record({
      actorUserId: userId,
      action: 'auth.login',
      entityType: 'auth_sessions',
      entityId: sessionId,
      ...metadata,
    });
  }

  logout(userId: string, sessionId: string, metadata: RequestMetadata) {
    return this.audit.record({
      actorUserId: userId,
      action: 'auth.logout',
      entityType: 'auth_sessions',
      entityId: sessionId,
      ...metadata,
    });
  }

  logoutAll(userId: string, metadata: RequestMetadata) {
    return this.audit.record({
      actorUserId: userId,
      action: 'auth.logout_all',
      entityType: 'users',
      entityId: userId,
      ...metadata,
    });
  }

  passwordChanged(userId: string, metadata: RequestMetadata) {
    return this.audit.record({
      actorUserId: userId,
      action: 'auth.password_changed',
      entityType: 'users',
      entityId: userId,
      ...metadata,
    });
  }

  sessionRevoked(userId: string, sessionId: string, metadata: RequestMetadata) {
    return this.audit.record({
      actorUserId: userId,
      action: 'auth.session_revoked',
      entityType: 'auth_sessions',
      entityId: sessionId,
      ...metadata,
    });
  }

  refreshReuse(
    error: RefreshTokenReuseError,
    requestMetadata: RequestMetadata,
  ) {
    return this.audit.record({
      actorUserId: error.userId,
      action: 'auth.refresh_reuse_detected',
      entityType: 'auth_sessions',
      entityId: error.sessionId,
      metadata: { tokenFamilyId: error.tokenFamilyId },
      ...requestMetadata,
    });
  }
}

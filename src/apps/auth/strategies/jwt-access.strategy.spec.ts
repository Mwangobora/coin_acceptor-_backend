import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { JwtAccessStrategy } from './jwt-access.strategy';

describe('JwtAccessStrategy', () => {
  const config = {
    getOrThrow: () => 'access-secret',
  } as unknown as ConfigService;

  const activeSession = {
    id: 'session-1',
    user_id: 'user-1',
    revoked_at: null,
    expires_at: new Date(Date.now() + 60_000),
    users: {
      id: 'user-1',
      email: 'admin@example.com',
      full_name: 'Admin User',
      status: 'active',
      must_change_password: false,
      locked_until: null,
    },
  };

  function strategyWithSession(session: unknown) {
    return new JwtAccessStrategy(config, {
      auth_sessions: {
        findUnique: jest.fn().mockResolvedValue(session),
      },
    } as never);
  }

  it('maps a valid database session to an authenticated user', async () => {
    await expect(
      strategyWithSession(activeSession).validate({
        sub: 'user-1',
        sessionId: 'session-1',
        type: 'access',
      }),
    ).resolves.toEqual({
      id: 'user-1',
      email: 'admin@example.com',
      fullName: 'Admin User',
      status: 'active',
      mustChangePassword: false,
      sessionId: 'session-1',
    });
  });

  it('rejects invalid payload type and session ownership', async () => {
    await expect(
      strategyWithSession(activeSession).validate({
        sub: 'user-1',
        sessionId: 'session-1',
        type: 'refresh' as never,
      }),
    ).rejects.toThrow(UnauthorizedException);
    await expect(
      strategyWithSession(undefined).validate({
        sub: 'user-1',
        sessionId: 'session-1',
        type: 'access',
      }),
    ).rejects.toThrow(UnauthorizedException);
    await expect(
      strategyWithSession({ ...activeSession, user_id: 'other-user' }).validate(
        {
          sub: 'user-1',
          sessionId: 'session-1',
          type: 'access',
        },
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects revoked, expired, inactive, and locked sessions', async () => {
    const rejectedSessions = [
      { ...activeSession, revoked_at: new Date() },
      { ...activeSession, expires_at: new Date(Date.now() - 60_000) },
      {
        ...activeSession,
        users: { ...activeSession.users, status: 'inactive' },
      },
      {
        ...activeSession,
        users: {
          ...activeSession.users,
          locked_until: new Date(Date.now() + 60_000),
        },
      },
    ];

    for (const session of rejectedSessions) {
      await expect(
        strategyWithSession(session).validate({
          sub: 'user-1',
          sessionId: 'session-1',
          type: 'access',
        }),
      ).rejects.toThrow(UnauthorizedException);
    }
  });
});

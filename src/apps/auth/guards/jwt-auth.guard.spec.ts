import { ForbiddenException } from '@nestjs/common';

import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthRequest } from '../types/auth-request.type';

describe('JwtAuthGuard', () => {
  class TestGuard extends JwtAuthGuard {
    check(request: { method: string; originalUrl: string; user?: unknown }) {
      return this['blockPasswordChangeRequired'](request as AuthRequest);
    }
  }

  const guard = new TestGuard();

  it('blocks unrelated routes when password change is required', () => {
    expect(() =>
      guard.check({
        method: 'GET',
        originalUrl: '/api/v1/auth/sessions',
        user: { mustChangePassword: true },
      }),
    ).toThrow(ForbiddenException);
  });

  it('allows /auth/me while password change is required', () => {
    expect(() =>
      guard.check({
        method: 'GET',
        originalUrl: '/api/v1/auth/me',
        user: { mustChangePassword: true },
      }),
    ).not.toThrow();
  });
});

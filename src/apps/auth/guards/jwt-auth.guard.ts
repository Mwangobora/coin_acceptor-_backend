import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import type { AuthRequest } from '../types/auth-request.type';
import type { AuthenticatedUser } from '../types/authenticated-user.type';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const canActivate = (await super.canActivate(context)) as boolean;
    const request = context.switchToHttp().getRequest<AuthRequest>();
    this.blockPasswordChangeRequired(request);
    return canActivate;
  }

  override handleRequest<TUser = AuthenticatedUser>(
    error: Error | null,
    user: TUser | false,
  ): TUser {
    if (error || !user) throw error ?? new UnauthorizedException();
    return user;
  }

  private blockPasswordChangeRequired(request: AuthRequest): void {
    if (!request.user?.mustChangePassword) return;
    if (this.isAllowedWhilePasswordChangeRequired(request)) return;
    throw new ForbiddenException('Password change required.');
  }

  private isAllowedWhilePasswordChangeRequired(request: AuthRequest): boolean {
    const path = request.originalUrl.split('?')[0];
    return (
      (request.method === 'GET' && path.endsWith('/auth/me')) ||
      (request.method === 'PATCH' && path.endsWith('/auth/change-password')) ||
      (request.method === 'POST' && path.endsWith('/auth/logout'))
    );
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { PrismaService } from '../../../database/prisma.service';
import { ACCESS_TOKEN_COOKIE } from '../constants/auth.constants';
import type { AccessTokenPayload } from '../types/jwt-payload.type';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => cookieValue(request, ACCESS_TOKEN_COOKIE),
      ]),
      secretOrKey: config.getOrThrow<string>('security.jwtAccessSecret'),
    });
  }

  async validate(payload: AccessTokenPayload) {
    if (payload.type !== 'access') throw new UnauthorizedException();
    const session = await this.prisma.auth_sessions.findUnique({
      where: { id: payload.sessionId },
      include: { users: true },
    });
    const now = new Date();
    if (!session || session.user_id !== payload.sub)
      throw new UnauthorizedException();
    if (session.revoked_at || session.expires_at <= now) {
      throw new UnauthorizedException();
    }
    const user = session.users;
    if (user.status !== 'active') throw new UnauthorizedException();
    if (user.locked_until && user.locked_until > now) {
      throw new UnauthorizedException();
    }
    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      status: user.status,
      mustChangePassword: user.must_change_password,
      sessionId: session.id,
    };
  }
}

function cookieValue(request: Request, name: string): string | null {
  const cookies: unknown = request.cookies;
  if (!cookies || typeof cookies !== 'object') return null;
  const value = (cookies as Record<string, unknown>)[name];
  return typeof value === 'string' ? value : null;
}

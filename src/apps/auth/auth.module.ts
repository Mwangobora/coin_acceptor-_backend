import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';

import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PrismaModule } from '../../database/prisma.module';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthAccountService } from './services/auth-account.service';
import { AuthAuditService } from './services/auth-audit.service';
import { AuthCookieService } from './services/auth-cookie.service';
import { AuthSessionService } from './services/auth-session.service';
import { AuthTtlService } from './services/auth-ttl.service';
import { AuthService } from './services/auth.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';

@Module({
  imports: [
    PrismaModule,
    AuditLogsModule,
    PassportModule,
    JwtModule.register({}),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthAccountService,
    AuthAuditService,
    AuthSessionService,
    AuthCookieService,
    AuthTtlService,
    PasswordService,
    TokenService,
    JwtAccessStrategy,
    JwtAuthGuard,
  ],
})
export class AuthModule {}

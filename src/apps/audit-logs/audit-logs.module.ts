import { Module } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaModule } from '../../database/prisma.module';
import {
  AuditLogsController,
  auditLogAuthorizationProviders,
} from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';

@Module({
  imports: [PrismaModule],
  controllers: [AuditLogsController],
  providers: [
    AuditLogsService,
    JwtAuthGuard,
    ...auditLogAuthorizationProviders,
  ],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}

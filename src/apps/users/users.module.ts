import { Module } from '@nestjs/common';

import { AccessControlModule } from '../access-control/access-control.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../database/prisma.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [PrismaModule, AuthModule, AccessControlModule, AuditLogsModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}

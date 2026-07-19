import { Module } from '@nestjs/common';

import { AccessControlModule } from '../access-control/access-control.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PrismaModule } from '../../database/prisma.module';
import { LockersController } from './lockers.controller';
import { LockerAuditBuilder } from './services/locker-audit.builder';
import { LockerAvailabilityOperation } from './services/locker-availability.operation';
import { LockerAvailabilityPolicy } from './services/locker-availability.policy';
import { LockerCreateOperation } from './services/locker-create.operation';
import { LockerQueryBuilder } from './services/locker-query.builder';
import { LockerReadOperation } from './services/locker-read.operation';
import { LockerRecordService } from './services/locker-record.service';
import { LockerUpdateOperation } from './services/locker-update.operation';
import { LockersService } from './services/lockers.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuditLogsModule],
  controllers: [LockersController],
  providers: [
    LockersService,
    LockerCreateOperation,
    LockerUpdateOperation,
    LockerAvailabilityOperation,
    LockerReadOperation,
    LockerQueryBuilder,
    LockerRecordService,
    LockerAuditBuilder,
    LockerAvailabilityPolicy,
  ],
})
export class LockersModule {}

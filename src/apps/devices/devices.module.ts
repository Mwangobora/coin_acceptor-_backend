import { Module } from '@nestjs/common';

import { AccessControlModule } from '../access-control/access-control.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PrismaModule } from '../../database/prisma.module';
import { DevicesController } from './devices.controller';
import { DeviceAdminPolicyService } from './services/device-admin-policy.service';
import { DeviceAuditBuilder } from './services/device-audit.builder';
import { DeviceDataFactory } from './services/device-data.factory';
import { DeviceLifecyclePolicy } from './services/device-lifecycle.policy';
import { DeviceLifecycleService } from './services/device-lifecycle.service';
import { DeviceQueryBuilder } from './services/device-query.builder';
import { DeviceReadService } from './services/device-read.service';
import { DeviceRecordService } from './services/device-record.service';
import { DeviceSummaryService } from './services/device-summary.service';
import { DeviceWriteService } from './services/device-write.service';
import { DevicesService } from './services/devices.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuditLogsModule],
  controllers: [DevicesController],
  providers: [
    DevicesService,
    DeviceQueryBuilder,
    DeviceAdminPolicyService,
    DeviceDataFactory,
    DeviceAuditBuilder,
    DeviceSummaryService,
    DeviceRecordService,
    DeviceReadService,
    DeviceWriteService,
    DeviceLifecycleService,
    DeviceLifecyclePolicy,
  ],
})
export class DevicesModule {}

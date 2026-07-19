import { Module } from '@nestjs/common';

import { AccessControlModule } from '../access-control/access-control.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PrismaModule } from '../../database/prisma.module';
import { ChargingPortsController } from './charging-ports.controller';
import { ChargingPortAdminPolicy } from './services/charging-port-admin.policy';
import { ChargingPortAuditBuilder } from './services/charging-port-audit.builder';
import { ChargingPortCreateOperation } from './services/charging-port-create.operation';
import { ChargingPortDataFactory } from './services/charging-port-data.factory';
import { ChargingPortQueryBuilder } from './services/charging-port-query.builder';
import { ChargingPortReadOperation } from './services/charging-port-read.operation';
import { ChargingPortRecordService } from './services/charging-port-record.service';
import { ChargingPortStatusOperation } from './services/charging-port-status.operation';
import { ChargingPortStatusPolicy } from './services/charging-port-status.policy';
import { ChargingPortUpdateOperation } from './services/charging-port-update.operation';
import { ChargingPortsService } from './services/charging-ports.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuditLogsModule],
  controllers: [ChargingPortsController],
  providers: [
    ChargingPortsService,
    ChargingPortCreateOperation,
    ChargingPortUpdateOperation,
    ChargingPortStatusOperation,
    ChargingPortReadOperation,
    ChargingPortQueryBuilder,
    ChargingPortRecordService,
    ChargingPortAdminPolicy,
    ChargingPortDataFactory,
    ChargingPortAuditBuilder,
    ChargingPortStatusPolicy,
  ],
})
export class ChargingPortsModule {}

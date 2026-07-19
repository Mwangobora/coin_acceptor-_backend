import { Module } from '@nestjs/common';

import { AccessControlModule } from '../access-control/access-control.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PrismaModule } from '../../database/prisma.module';
import { StationAuditBuilder } from './services/station-audit.builder';
import { StationDataFactory } from './services/station-data.factory';
import { StationInputValidator } from './services/station-input.validator';
import { StationQueryBuilder } from './services/station-query.builder';
import { StationReadService } from './services/station-read.service';
import { StationRecordService } from './services/station-record.service';
import { StationStatusService } from './services/station-status.service';
import { StationStatusPolicy } from './services/station-status.policy';
import { StationSummaryService } from './services/station-summary.service';
import { StationsService } from './services/stations.service';
import { StationWriteService } from './services/station-write.service';
import { StationsController } from './stations.controller';

@Module({
  imports: [PrismaModule, AccessControlModule, AuditLogsModule],
  controllers: [StationsController],
  providers: [
    StationsService,
    StationQueryBuilder,
    StationInputValidator,
    StationDataFactory,
    StationAuditBuilder,
    StationSummaryService,
    StationRecordService,
    StationReadService,
    StationWriteService,
    StationStatusService,
    StationStatusPolicy,
  ],
})
export class StationsModule {}

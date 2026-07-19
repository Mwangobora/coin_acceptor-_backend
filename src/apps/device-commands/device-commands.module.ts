import { Module } from '@nestjs/common';

import { AccessControlModule } from '../access-control/access-control.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PrismaModule } from '../../database/prisma.module';
import { DeviceCommandsController } from './device-commands.controller';
import { CommandAcknowledgementService } from './services/command-acknowledgement.service';
import { CommandExpiryService } from './services/command-expiry.service';
import { CommandIdempotencyService } from './services/command-idempotency.service';
import { CommandPayloadSanitizerService } from './services/command-payload-sanitizer.service';
import { CommandPayloadValidatorRegistry } from './services/command-payload-validator-registry';
import { CommandPollingService } from './services/command-polling.service';
import { CommandQueryBuilder } from './services/command-query.builder';
import { CommandRequirementsPolicy } from './services/command-requirements.policy';
import { CommandTransitionPolicy } from './services/command-transition.policy';
import { DeviceCommandsService } from './services/device-commands.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuditLogsModule],
  controllers: [DeviceCommandsController],
  providers: [
    DeviceCommandsService,
    CommandPollingService,
    CommandExpiryService,
    CommandAcknowledgementService,
    CommandIdempotencyService,
    CommandPayloadSanitizerService,
    CommandPayloadValidatorRegistry,
    CommandQueryBuilder,
    CommandRequirementsPolicy,
    CommandTransitionPolicy,
  ],
  exports: [
    CommandPollingService,
    CommandAcknowledgementService,
    CommandTransitionPolicy,
  ],
})
export class DeviceCommandsModule {}

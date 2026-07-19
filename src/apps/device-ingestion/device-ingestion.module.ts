import { Module } from '@nestjs/common';

import { AccessControlModule } from '../access-control/access-control.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { DeviceCommandsModule } from '../device-commands/device-commands.module';
import { DeviceSecretEncryptionService } from '../device-credentials/services/device-secret-encryption.service';
import { PaymentsModule } from '../payments/payments.module';
import { PrismaModule } from '../../database/prisma.module';
import { DevicePaymentsController } from './controllers/device-payments.controller';
import { DeviceAuthGuard } from './auth/device-auth.guard';
import { DeviceIngestionController } from './device-ingestion.controller';
import { ChargingPortEventHandler } from './handlers/charging-port-event.handler';
import { CommandAckEventHandler } from './handlers/command-ack-event.handler';
import { HeartbeatEventHandler } from './handlers/heartbeat-event.handler';
import { LockerEventHandler } from './handlers/locker-event.handler';
import { TelemetryEventHandler } from './handlers/telemetry-event.handler';
import { DeviceApiKeyService } from './services/device-api-key.service';
import { DeviceAuthService } from './services/device-auth.service';
import { DeviceEventProcessor } from './services/device-event-processor';
import { DeviceEventReadService } from './services/device-event-read.service';
import { DeviceEventValidatorService } from './services/device-event-validator.service';
import { DeviceEventService } from './services/device-event.service';
import { DeviceHmacService } from './services/device-hmac.service';
import { DeviceReplayProtectionService } from './services/device-replay-protection.service';
import { DeviceTelemetryReadService } from './services/device-telemetry-read.service';
import { PayloadHashService } from './services/payload-hash.service';
import { SensitivePayloadService } from './services/sensitive-payload.service';

@Module({
  imports: [
    PrismaModule,
    AuditLogsModule,
    AccessControlModule,
    DeviceCommandsModule,
    PaymentsModule,
  ],
  controllers: [DeviceIngestionController, DevicePaymentsController],
  providers: [
    DeviceAuthGuard,
    DeviceAuthService,
    DeviceApiKeyService,
    DeviceHmacService,
    DeviceReplayProtectionService,
    DeviceSecretEncryptionService,
    DeviceEventService,
    DeviceEventReadService,
    DeviceTelemetryReadService,
    DeviceEventProcessor,
    DeviceEventValidatorService,
    PayloadHashService,
    SensitivePayloadService,
    HeartbeatEventHandler,
    TelemetryEventHandler,
    LockerEventHandler,
    ChargingPortEventHandler,
    CommandAckEventHandler,
  ],
})
export class DeviceIngestionModule {}

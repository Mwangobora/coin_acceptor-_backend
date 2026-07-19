import { Module } from '@nestjs/common';

import { AlertsModule } from './apps/alerts/alerts.module';
import { AuditLogsModule } from './apps/audit-logs/audit-logs.module';
import { AuthModule } from './apps/auth/auth.module';
import { AccessControlModule } from './apps/access-control/access-control.module';
import { ChargingSessionsModule } from './apps/charging-sessions/charging-sessions.module';
import { DeviceIngestionModule } from './apps/device-ingestion/device-ingestion.module';
import { DevicesModule } from './apps/devices/devices.module';
import { HealthModule } from './apps/health/health.module';
import { LockersModule } from './apps/lockers/lockers.module';
import { PaymentsModule } from './apps/payments/payments.module';
import { ReportsModule } from './apps/reports/reports.module';
import { SettingsModule } from './apps/settings/settings.module';
import { StationsModule } from './apps/stations/stations.module';
import { UsersModule } from './apps/users/users.module';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './database/prisma.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    AccessControlModule,
    UsersModule,
    StationsModule,
    DevicesModule,
    DeviceIngestionModule,
    ChargingSessionsModule,
    PaymentsModule,
    LockersModule,
    AlertsModule,
    ReportsModule,
    AuditLogsModule,
    SettingsModule,
  ],
})
export class AppModule {}

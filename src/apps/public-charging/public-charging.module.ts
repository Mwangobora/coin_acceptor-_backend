import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';

import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { DeviceCredentialsModule } from '../device-credentials/device-credentials.module';
import { PaymentsModule } from '../payments/payments.module';
import { PrismaModule } from '../../database/prisma.module';
import { PublicChargingController } from './controllers/public-charging.controller';
import { AccessCodeClaimService } from './services/access-code-claim.service';
import { AccessCodeGenerationService } from './services/access-code-generation.service';
import { AccessCodeVerifierService } from './services/access-code-verifier.service';
import { AnonymousCheckoutService } from './services/anonymous-checkout.service';
import { AnonymousCustomerFlowService } from './services/anonymous-customer-flow.service';
import { PublicPackageService } from './services/public-package.service';
import { PublicPaymentService } from './services/public-payment.service';
import { PublicQrResolutionService } from './services/public-qr-resolution.service';
import { PublicRedisTokenStore } from './services/public-redis-token.store';
import { PublicSessionCreationService } from './services/public-session-creation.service';
import { PublicSessionQueryService } from './services/public-session-query.service';
import { PublicTokenCryptoService } from './services/public-token-crypto.service';

@Module({
  imports: [
    PrismaModule,
    AuditLogsModule,
    DeviceCredentialsModule,
    PaymentsModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 30 }]),
  ],
  controllers: [PublicChargingController],
  providers: [
    AccessCodeClaimService,
    AccessCodeGenerationService,
    AccessCodeVerifierService,
    AnonymousCheckoutService,
    AnonymousCustomerFlowService,
    PublicPackageService,
    PublicPaymentService,
    PublicQrResolutionService,
    PublicRedisTokenStore,
    PublicSessionCreationService,
    PublicSessionQueryService,
    PublicTokenCryptoService,
  ],
  exports: [PublicSessionCreationService],
})
export class PublicChargingModule {}

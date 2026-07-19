import { Module } from '@nestjs/common';

import { AccessControlModule } from '../access-control/access-control.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PrismaModule } from '../../database/prisma.module';
import { CoinInsertionEventHandler } from './handlers/coin-insertion-event.handler';
import { PaymentsController } from './payments.controller';
import { PaymentWebhooksController } from './payment-webhooks.controller';
import { MockQrPaymentProvider } from './providers/mock-qr-payment.provider';
import { QrProviderRegistry } from './providers/qr-provider.registry';
import { ChargingPackageReadService } from './services/charging-package-read.service';
import { CoinPulseMappingService } from './services/coin-pulse-mapping.service';
import { PaymentCancellationService } from './services/payment-cancellation.service';
import { PaymentExpirationService } from './services/payment-expiration.service';
import { PaymentInitiationService } from './services/payment-initiation.service';
import { PaymentReadService } from './services/payment-read.service';
import { PaymentRefundService } from './services/payment-refund.service';
import { PaymentSanitizerService } from './services/payment-sanitizer.service';
import { PaymentStatusPolicy } from './services/payment-status.policy';
import { PaymentWebhookService } from './services/payment-webhook.service';
import { QrPaymentService } from './services/qr-payment.service';

@Module({
  imports: [PrismaModule, AuditLogsModule, AccessControlModule],
  controllers: [PaymentsController, PaymentWebhooksController],
  providers: [
    ChargingPackageReadService,
    CoinInsertionEventHandler,
    CoinPulseMappingService,
    MockQrPaymentProvider,
    PaymentCancellationService,
    PaymentExpirationService,
    PaymentInitiationService,
    PaymentReadService,
    PaymentRefundService,
    PaymentSanitizerService,
    PaymentStatusPolicy,
    PaymentWebhookService,
    QrPaymentService,
    QrProviderRegistry,
  ],
  exports: [
    ChargingPackageReadService,
    CoinInsertionEventHandler,
    PaymentCancellationService,
    PaymentInitiationService,
    PaymentReadService,
  ],
})
export class PaymentsModule {}

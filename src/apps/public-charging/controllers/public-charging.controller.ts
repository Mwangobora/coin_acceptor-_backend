import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';

import { API_VERSION } from '../../../common/constants/api.constants';
import {
  CHECKOUT_TOKEN_HEADER,
  CUSTOMER_FLOW_HEADER,
} from '../constants/public-charging.constants';
import { CreatePublicPaymentDto } from '../dto/create-public-payment.dto';
import { ResolvePublicQrDto } from '../dto/resolve-public-qr.dto';
import { AccessCodeClaimService } from '../services/access-code-claim.service';
import { PublicPackageService } from '../services/public-package.service';
import { PublicPaymentService } from '../services/public-payment.service';
import { PublicQrResolutionService } from '../services/public-qr-resolution.service';
import { PublicSessionQueryService } from '../services/public-session-query.service';
import { AnonymousCheckoutService } from '../services/anonymous-checkout.service';
import {
  ClaimAccessCodeDocs,
  CreatePaymentDocs,
  PackagesDocs,
  PaymentStatusDocs,
  ResolveQrDocs,
  SessionStatusDocs,
} from '../public-charging.swagger';

@ApiTags('public-charging')
@UseGuards(ThrottlerGuard)
@Controller({ path: 'public/charging', version: API_VERSION })
export class PublicChargingController {
  constructor(
    private readonly qr: PublicQrResolutionService,
    private readonly checkout: AnonymousCheckoutService,
    private readonly packages: PublicPackageService,
    private readonly payments: PublicPaymentService,
    private readonly accessCodes: AccessCodeClaimService,
    private readonly sessions: PublicSessionQueryService,
  ) {}

  @Post('qr/resolve')
  @ResolveQrDocs()
  resolveQr(@Body() dto: ResolvePublicQrDto) {
    return this.qr.resolve(dto.qrToken);
  }

  @Get('packages')
  @PackagesDocs()
  async listPackages(@Headers(CHECKOUT_TOKEN_HEADER) token: string) {
    const checkout = await this.checkout.require(token);
    return this.packages.listForDevice(checkout.stationId);
  }

  @Post('payments')
  @CreatePaymentDocs()
  initiatePayment(
    @Headers(CHECKOUT_TOKEN_HEADER) token: string,
    @Body() dto: CreatePublicPaymentDto,
  ) {
    return this.payments.initiate({
      checkoutToken: token,
      packageId: dto.packageId,
      idempotencyKey: dto.idempotencyKey,
      paymentMethod: dto.paymentMethod,
    });
  }

  @Get('payments/:paymentReference/status')
  @PaymentStatusDocs()
  paymentStatus(
    @Param('paymentReference') paymentReference: string,
    @Headers(CUSTOMER_FLOW_HEADER) token: string,
  ) {
    return this.payments.status(paymentReference, token);
  }

  @Post('sessions/:sessionReference/access-code')
  @ClaimAccessCodeDocs()
  claimAccessCode(
    @Param('sessionReference') sessionReference: string,
    @Headers(CUSTOMER_FLOW_HEADER) token: string,
  ) {
    return this.accessCodes.claim(sessionReference, token);
  }

  @Get('sessions/:sessionReference')
  @SessionStatusDocs()
  sessionStatus(
    @Param('sessionReference') sessionReference: string,
    @Headers(CUSTOMER_FLOW_HEADER) token: string,
  ) {
    return this.sessions.get(sessionReference, token);
  }
}

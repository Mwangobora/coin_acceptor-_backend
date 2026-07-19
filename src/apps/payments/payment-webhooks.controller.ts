import { Controller, Headers, Param, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { API_VERSION } from '../../common/constants/api.constants';
import { PaymentWebhookService } from './services/payment-webhook.service';

type RawRequest = Request & { rawBody?: Buffer };

@ApiTags('payment-webhooks')
@Controller({ version: API_VERSION })
export class PaymentWebhooksController {
  constructor(private readonly webhooks: PaymentWebhookService) {}

  @Post('payment-webhooks/:provider')
  receive(
    @Param('provider') providerName: string,
    @Req() request: RawRequest,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.webhooks.receive({
      providerName,
      rawBody: request.rawBody ?? Buffer.alloc(0),
      headers,
    });
  }
}

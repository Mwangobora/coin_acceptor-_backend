import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';

import { API_VERSION } from '../../common/constants/api.constants';
import { RequirePermissions } from '../access-control/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../access-control/guards/permissions.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PaymentQueryDto } from './dto/payment-query.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { PaymentReadService } from './services/payment-read.service';
import { PaymentRefundService } from './services/payment-refund.service';

@ApiTags('payments')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ version: API_VERSION })
export class PaymentsController {
  constructor(
    private readonly reads: PaymentReadService,
    private readonly refunds: PaymentRefundService,
  ) {}

  @Get('payments')
  @RequirePermissions('payments.read')
  list(
    @Query() query: PaymentQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reads.list(query, user);
  }

  @Get('payments/:id')
  @RequirePermissions('payments.read')
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reads.get(id, user);
  }

  @Post('payments/:id/refund')
  @RequirePermissions('payments.refund')
  refund(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RefundPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.refunds.refund(id, dto, user);
  }
}

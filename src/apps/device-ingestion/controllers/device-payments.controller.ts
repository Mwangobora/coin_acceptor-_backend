import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { API_VERSION } from '../../../common/constants/api.constants';
import { CancelDevicePaymentDto } from '../../payments/dto/cancel-device-payment.dto';
import { CreateDevicePaymentDto } from '../../payments/dto/create-device-payment.dto';
import { ChargingPackageReadService } from '../../payments/services/charging-package-read.service';
import { PaymentCancellationService } from '../../payments/services/payment-cancellation.service';
import { PaymentInitiationService } from '../../payments/services/payment-initiation.service';
import { PaymentReadService } from '../../payments/services/payment-read.service';
import { DeviceAuthGuard } from '../auth/device-auth.guard';
import type { DeviceAuthRequest } from '../types/authenticated-device.type';

@ApiTags('device-payments')
@UseGuards(DeviceAuthGuard)
@Controller({ version: API_VERSION })
export class DevicePaymentsController {
  constructor(
    private readonly packages: ChargingPackageReadService,
    private readonly initiation: PaymentInitiationService,
    private readonly reads: PaymentReadService,
    private readonly cancellations: PaymentCancellationService,
  ) {}

  @Get('device-ingestion/charging-packages')
  packagesForDevice(@Req() req: DeviceAuthRequest) {
    return this.packages.listAvailable(req.deviceAuth!);
  }

  @Post('device-ingestion/payments')
  initiate(@Body() dto: CreateDevicePaymentDto, @Req() req: DeviceAuthRequest) {
    return this.initiation.initiate(req.deviceAuth!, dto);
  }

  @Get('device-ingestion/payments/:paymentReference')
  get(
    @Param('paymentReference') reference: string,
    @Req() req: DeviceAuthRequest,
  ) {
    return this.reads.getForDevice(reference, req.deviceAuth!);
  }

  @Post('device-ingestion/payments/:paymentReference/cancel')
  cancel(
    @Param('paymentReference') reference: string,
    @Body() dto: CancelDevicePaymentDto,
    @Req() req: DeviceAuthRequest,
  ) {
    return this.cancellations.cancel({
      paymentReference: reference,
      auth: req.deviceAuth!,
      reason: dto.reason,
    });
  }
}

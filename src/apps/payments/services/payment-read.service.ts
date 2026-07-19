import { NotFoundException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import type { AuthenticatedDevice } from '../../device-ingestion/types/authenticated-device.type';
import { mapPayment } from '../mappers/payment.mapper';

@Injectable()
export class PaymentReadService {
  constructor(private readonly prisma: PrismaService) {}

  async getForDevice(paymentReference: string, auth: AuthenticatedDevice) {
    const payment = await this.prisma.payments.findFirst({
      where: {
        payment_reference: paymentReference,
        device_id: auth.deviceId,
        station_id: auth.stationId,
      },
      include: { qr_payment_transactions: true },
    });
    if (!payment) throw new NotFoundException('Payment not found.');
    return mapPayment(payment, payment.qr_payment_transactions);
  }
}

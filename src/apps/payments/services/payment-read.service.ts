import { NotFoundException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { StationScopeService } from '../../access-control/services/station-scope.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import {
  buildPaginatedResult,
  pageToSkip,
} from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../database/prisma.service';
import type { AuthenticatedDevice } from '../../device-ingestion/types/authenticated-device.type';
import type { PaymentQueryDto } from '../dto/payment-query.dto';
import { mapPayment } from '../mappers/payment.mapper';

@Injectable()
export class PaymentReadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: StationScopeService,
  ) {}

  async list(query: PaymentQueryDto, actor: AuthenticatedUser) {
    const where = {
      ...(await this.scope.paymentWhere(actor.id, 'payments.read')),
      ...paymentWhere(query),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.payments.findMany({
        where,
        include: { qr_payment_transactions: true },
        orderBy: paymentOrder(query.sortBy, query.sortOrder),
        skip: pageToSkip(query.page, query.pageSize),
        take: query.pageSize,
      }),
      this.prisma.payments.count({ where }),
    ]);
    return buildPaginatedResult(
      items.map((item) => mapPayment(item, item.qr_payment_transactions)),
      query.page,
      query.pageSize,
      total,
    );
  }

  async get(id: string, actor: AuthenticatedUser) {
    const payment = await this.prisma.payments.findUnique({
      where: { id },
      include: { qr_payment_transactions: true },
    });
    if (!payment) throw new NotFoundException('Payment not found.');
    await this.scope.requireStation(
      actor.id,
      'payments.read',
      payment.station_id,
    );
    return mapPayment(payment, payment.qr_payment_transactions);
  }

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

function paymentWhere(query: PaymentQueryDto): Prisma.paymentsWhereInput {
  return {
    ...(query.stationId ? { station_id: query.stationId } : {}),
    ...(query.deviceId ? { device_id: query.deviceId } : {}),
    ...(query.paymentMethod ? { payment_method: query.paymentMethod } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            {
              payment_reference: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
            {
              package_name_snapshot: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
          ],
        }
      : {}),
  };
}

function paymentOrder(
  sortBy = 'initiatedAt',
  sortOrder: 'asc' | 'desc' = 'desc',
) {
  const fields: Record<string, Prisma.paymentsOrderByWithRelationInput> = {
    initiatedAt: { initiated_at: sortOrder },
    status: { status: sortOrder },
    paymentMethod: { payment_method: sortOrder },
  };
  return fields[sortBy] ?? { initiated_at: sortOrder };
}

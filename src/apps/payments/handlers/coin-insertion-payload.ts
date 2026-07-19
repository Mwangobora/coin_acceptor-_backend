import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export type CoinPayload = {
  paymentReference: string;
  pulseCount: number;
  insertedAt?: Date;
  metadata?: Record<string, unknown>;
};

export function parseCoinPayload(payload: Prisma.JsonObject): CoinPayload {
  const paymentReference = stringField(payload.paymentReference);
  const pulseCount = Number(payload.pulseCount);
  if (!paymentReference || !Number.isInteger(pulseCount) || pulseCount < 1) {
    throw new BadRequestException('Invalid coin insertion payload.');
  }
  const insertedAt =
    typeof payload.insertedAt === 'string'
      ? new Date(payload.insertedAt)
      : undefined;
  return {
    paymentReference,
    pulseCount,
    insertedAt,
    metadata: objectField(payload.metadata),
  };
}

function stringField(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function objectField(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

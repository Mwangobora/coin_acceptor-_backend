import type { Prisma } from '@prisma/client';

export function publicPaymentMetadata(input: {
  checkoutHash: string;
  paymentMethod?: string;
}): Prisma.InputJsonObject {
  return {
    channel: 'public_customer',
    checkoutHash: input.checkoutHash,
    ...(input.paymentMethod ? { paymentMethod: input.paymentMethod } : {}),
  };
}

export function paymentIsPublicCustomer(value: Prisma.JsonValue): boolean {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    (value as Record<string, unknown>).channel === 'public_customer'
  );
}

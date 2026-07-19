export const PAYMENT_METHODS = ['coin', 'qr'] as const;
export const PAYMENT_STATUSES = [
  'pending',
  'processing',
  'confirmed',
  'failed',
  'expired',
  'cancelled',
  'refunded',
] as const;

export const QR_PROVIDER_STATUSES = [
  'created',
  'pending',
  'confirmed',
  'failed',
  'expired',
  'cancelled',
  'refunded',
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type QrProviderStatus = (typeof QR_PROVIDER_STATUSES)[number];

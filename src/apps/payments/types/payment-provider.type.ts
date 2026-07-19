export type QrCreateInput = {
  paymentReference: string;
  merchantReference: string;
  amountMinor: bigint;
  currency: string;
  expiresAt?: Date;
};

export type QrCreateResult = {
  provider: string;
  merchantReference: string;
  providerTransactionId?: string;
  qrReference?: string;
  qrPayload?: string;
  providerStatus: string;
  expiresAt?: Date;
  rawResponse: Record<string, unknown>;
};

export type QrWebhookEvent = {
  merchantReference: string;
  providerTransactionId?: string;
  status: 'confirmed' | 'failed' | 'expired';
  amountMinor: bigint;
  currency: string;
  rawResponse: Record<string, unknown>;
  failureCode?: string;
  failureReason?: string;
};

export type QrRefundResult = {
  providerStatus: 'refunded';
  providerTransactionId?: string;
  rawResponse: Record<string, unknown>;
};

export interface QrPaymentProvider {
  readonly name: string;
  createTransaction(input: QrCreateInput): Promise<QrCreateResult>;
  verifyWebhook(input: {
    rawBody: Buffer;
    headers: Record<string, string | string[] | undefined>;
  }): Promise<boolean>;
  parseWebhook(rawBody: Buffer): Promise<QrWebhookEvent>;
  queryTransaction(merchantReference: string): Promise<QrWebhookEvent | null>;
  refundTransaction(input: {
    merchantReference: string;
    providerTransactionId?: string | null;
    amountMinor: bigint;
    currency: string;
    idempotencyKey: string;
  }): Promise<QrRefundResult>;
}

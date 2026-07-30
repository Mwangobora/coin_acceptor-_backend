export type PaymentEnv = {
  QR_PAYMENT_PROVIDER: string;
  QR_MOCK_WEBHOOK_SECRET: string;
  QR_PAYMENT_EXPIRY_SECONDS: number;
  PAYMENT_PENDING_WINDOW_SECONDS: number;
};

export function parsePaymentEnv(
  config: Record<string, unknown>,
  nodeEnv: string,
): PaymentEnv {
  return {
    QR_PAYMENT_PROVIDER: parseQrProvider(config, nodeEnv),
    QR_MOCK_WEBHOOK_SECRET: optionalString(
      config,
      'QR_MOCK_WEBHOOK_SECRET',
      'development-mock-webhook-secret',
    ),
    QR_PAYMENT_EXPIRY_SECONDS: parsePositiveInt(
      config.QR_PAYMENT_EXPIRY_SECONDS,
      'QR_PAYMENT_EXPIRY_SECONDS',
      300,
    ),
    PAYMENT_PENDING_WINDOW_SECONDS: parsePositiveInt(
      config.PAYMENT_PENDING_WINDOW_SECONDS,
      'PAYMENT_PENDING_WINDOW_SECONDS',
      600,
    ),
  };
}

function parseQrProvider(config: Record<string, unknown>, nodeEnv: string) {
  const provider = optionalString(config, 'QR_PAYMENT_PROVIDER', 'mock');
  if (nodeEnv === 'production' && provider === 'mock') {
    throw new Error('QR_PAYMENT_PROVIDER=mock is not allowed in production.');
  }
  return provider;
}

function parsePositiveInt(value: unknown, key: string, defaultValue: number) {
  const raw =
    value === undefined || value === '' ? String(defaultValue) : value;
  if (typeof raw !== 'string') throw new Error(`${key} must be a number.`);
  const number = Number(raw);
  if (!Number.isInteger(number) || number < 1) {
    throw new Error(`${key} must be a positive integer.`);
  }
  return number;
}

function optionalString(
  config: Record<string, unknown>,
  key: string,
  defaultValue: string,
) {
  const value = config[key];
  if (value === undefined || value === '') return defaultValue;
  if (typeof value !== 'string') throw new Error(`${key} must be a string.`);
  return value;
}

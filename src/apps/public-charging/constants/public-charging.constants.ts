export const PUBLIC_QR_SETTING_KEY = 'public_charging.qr_identity';
export const CUSTOMER_FLOW_HEADER = 'x-customer-flow-token';
export const CHECKOUT_TOKEN_HEADER = 'x-checkout-token';

export const PUBLIC_TOKEN_BYTES = 32;
export const DEFAULT_CHECKOUT_TTL_SECONDS = 10 * 60;
export const DEFAULT_FLOW_TTL_SECONDS = 60 * 60;
export const ACCESS_CODE_TTL_SECONDS = 15 * 60;

export const PUBLIC_COMMAND_TYPE = 'charging.prepare';

export const PUBLIC_SECURITY_EVENTS = {
  qrResolved: 'public_qr.resolved',
  qrInvalid: 'public_qr.invalid',
  paymentInitiated: 'public_payment.initiated',
  paymentConfirmed: 'public_payment.confirmed',
  sessionCreated: 'public_session.created',
  accessCodeClaimed: 'public_access_code.claimed',
  accessCodeReplay: 'public_access_code.replay_attempt',
  invalidToken: 'public_flow.invalid_token',
} as const;

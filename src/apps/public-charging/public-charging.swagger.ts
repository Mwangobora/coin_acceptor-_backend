import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';

import {
  CHECKOUT_TOKEN_HEADER,
  CUSTOMER_FLOW_HEADER,
} from './constants/public-charging.constants';

export function ResolveQrDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Resolve scanned QR code for customer website' }),
    ApiBody({
      schema: { example: { qrToken: 'cmsqr_dVkGhCMkpUw2wAh5ZkSGHU_D5FbncfcQ' } },
    }),
    ApiCreatedResponse({
      description: 'Safe QR resolution data with packages and checkout token.',
      schema: { example: qrResolvedExample },
    }),
  );
}

export function PackagesDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'List available charging packages for checkout' }),
    ApiHeader({ name: CHECKOUT_TOKEN_HEADER }),
    ApiOkResponse({ schema: { example: qrResolvedExample.packages } }),
  );
}

export function CreatePaymentDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Accept public payment for selected package' }),
    ApiHeader({ name: CHECKOUT_TOKEN_HEADER }),
    ApiBody({ schema: { example: createPaymentRequestExample } }),
    ApiCreatedResponse({ schema: { example: createPaymentResponseExample } }),
  );
}

export function PaymentStatusDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Check accepted payment and session result' }),
    ApiHeader({ name: CUSTOMER_FLOW_HEADER }),
    ApiOkResponse({ schema: { example: paymentStatusExample } }),
  );
}

export function ClaimAccessCodeDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Claim locker PIN after accepted payment' }),
    ApiHeader({ name: CUSTOMER_FLOW_HEADER }),
  );
}

export function SessionStatusDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Read public charging session status' }),
    ApiHeader({ name: CUSTOMER_FLOW_HEADER }),
    ApiOkResponse({ schema: { example: sessionStatusExample } }),
  );
}

const qrResolvedExample = {
  station: { name: 'Charging station', region: 'Dar es Salaam' },
  device: { publicCode: 'DEVICE-001', name: 'Two Slot Charger', status: 'busy' },
  packages: [
    {
      publicPackageId: 'QUICK-200',
      name: 'Quick Charge',
      priceMinor: '200',
      currency: 'TZS',
      durationSeconds: 900,
    },
    {
      publicPackageId: 'STANDARD-500',
      name: 'Standard Charge',
      priceMinor: '500',
      currency: 'TZS',
      durationSeconds: 2700,
    },
  ],
  checkoutToken: 'short-lived-checkout-token',
};

const createPaymentRequestExample = {
  packageId: 'QUICK-200',
  paymentMethod: 'mpesa',
  idempotencyKey: '4a95b078-0538-44df-b6da-9162515691f8',
};

const createPaymentResponseExample = {
  paymentReference: 'PAY-20260813-ABC123',
  merchantReference: 'PAY-PAY-20260813-ABC123-uuid',
  amountMinor: '200',
  currency: 'TZS',
  provider: 'mpesa',
  status: 'confirmed',
  customerFlowToken: 'customer-flow-token',
};

const paymentStatusExample = {
  paymentReference: 'PAY-20260813-ABC123',
  status: 'confirmed',
  amountMinor: '200',
  currency: 'TZS',
  sessionReference: 'SESSION-20260813-ABC123',
  canClaimLockerPin: true,
};

const sessionStatusExample = {
  sessionReference: 'SESSION-20260813-ABC123',
  status: 'pending',
  lockerNumber: 1,
  portNumber: 1,
  amountPaid: '200',
  currency: 'TZS',
  purchasedDurationSeconds: 900,
  guidance: 'payment_confirmed',
};

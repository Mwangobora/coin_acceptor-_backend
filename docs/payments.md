# Payments

Payment processing is owned by `src/apps/payments`. Device-authenticated
routes remain under the device ingestion API surface, while admin-only refund
and public provider webhook routes are registered by `PaymentsModule`.

## Device Routes

All device routes require the existing API-key or HMAC device authentication.

```text
GET  /api/v1/device-ingestion/charging-packages
POST /api/v1/device-ingestion/payments
GET  /api/v1/device-ingestion/payments/:paymentReference
POST /api/v1/device-ingestion/payments/:paymentReference/cancel
POST /api/v1/device-ingestion/events
```

Coin insertions are ingested through `POST /device-ingestion/events` with:

```json
{
  "eventCategory": "payment",
  "eventType": "payment.coin_inserted",
  "payload": {
    "paymentReference": "PAY-...",
    "pulseCount": 5,
    "insertedAt": "2026-07-19T09:10:00.000Z"
  }
}
```

Coin pulses are mapped from the active `payments.coin_pulse_mapping`
`system_settings` row, scoped in this order: device, station, global. If no
setting exists, `COIN_PULSE_MAPPING_JSON` is used.

## QR Routes

```text
POST /api/v1/payment-webhooks/:provider
POST /api/v1/payments/:id/refund
```

The development QR provider is `mock`. It signs the raw webhook body with
`x-mock-signature`, using HMAC-SHA256 and `QR_MOCK_WEBHOOK_SECRET`.
`QR_PAYMENT_PROVIDER=mock` is rejected in production.

Refunds require `payments.refund`, are limited to confirmed QR payments, and
record audit logs.

## Status Rules

Payment transitions are centralized in `PaymentStatusPolicy`:

```text
pending -> processing, confirmed, failed, expired, cancelled
processing -> confirmed, failed, expired, cancelled
confirmed -> refunded
```

Confirmed payments must have enough received money and a confirmation time.
Failed, expired, cancelled, and refunded states set their matching timestamps.

## Expiration

`PaymentExpirationService` expires stale pending or processing payments. Coin
payments use `PAYMENT_PENDING_WINDOW_SECONDS`; QR payments use the QR
transaction expiry time.

## Demo Data

The demo seed includes:

- Confirmed coin payment with multiple accepted insertions
- Rejected coin insertion
- Pending coin payment
- Pending QR payment
- Confirmed QR payment
- Failed QR payment
- Refunded QR payment

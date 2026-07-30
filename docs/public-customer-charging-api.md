# Public Customer Charging API

Public customer endpoints live under `/api/v1/public/charging`.
Administrative APIs remain under `/api/v1/*`, and embedded-device APIs remain
under `/api/v1/device-ingestion/*`.

## QR URL

Device QR codes should open the customer web origin with an opaque token:

```text
https://customer.example.com/charge/{opaqueQrToken}
```

The QR must not contain database IDs, device credentials, prices, durations,
locker numbers, payment amounts, or admin URLs.

## Flow

1. `POST /qr/resolve` with `{ "qrToken": "..." }`.
2. Backend resolves the token hash through device-scoped system settings.
3. Backend returns safe station/device availability, QR-enabled packages, and a
   short-lived `checkoutToken`.
4. `GET /packages` requires `X-Checkout-Token`.
5. `POST /payments` requires `X-Checkout-Token` and accepts only `packageId`
   plus an idempotency key.
6. Backend creates the provider QR payment and returns a one-time
   `customerFlowToken`.
7. `GET /payments/:paymentReference/status` requires
   `X-Customer-Flow-Token`.
8. After provider confirmation, the backend reserves a locker/port and creates a
   pending charging session. It does not queue `charging.start`.
9. `POST /sessions/:sessionReference/access-code` returns the locker PIN once.
10. The PIN claim queues `charging.prepare` with an HMAC verifier only.
11. The device opens the locker after the first valid PIN entry for phone
    deposit.
12. Charging begins only after the device confirms locker opened, phone
    connected where detectable, and locker closed.
13. `GET /sessions/:sessionReference` returns customer-safe session guidance.

## Tokens

Checkout and customer-flow tokens are cryptographically random. Redis stores
only hashes and scoped metadata with TTLs. Tokens are sent in headers after
payment initiation, not query strings.

## Rate Limiting

The public module uses a stricter throttler guard for QR resolution, package
listing, payment initiation, status polling, PIN claim, and session status.

## Firmware Limitation

The backend now queues `charging.prepare` commands with an HMAC verifier after
PIN claim. The current physical prototype firmware is not claimed to support
remote command polling, verifier comparison, or the final collection lifecycle
until firmware integration is completed.

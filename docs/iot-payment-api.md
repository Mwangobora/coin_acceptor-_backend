# IoT Payment API Handoff

This document contains only the payment and charging-start flow needed for the
IoT device integration.

## Base URLs

Local Docker backend:

```text
http://localhost:4000/api/v1
```

Temporary internet backend for testing:

```text
https://all-lambda-learning-encryption.trycloudflare.com/api/v1
```

The temporary internet URL works only while the local Docker backend and
Cloudflare tunnel are running.

## Important Correction

The IoT device should not depend on a browser-only payload.

Correct production flow:

1. Customer scans QR code.
2. Customer website resolves QR and shows packages.
3. Customer selects TZS 200 or TZS 500.
4. Customer selects payment method: `mpesa`, `mixx_by_yas`, `airtel_money`, or
   `halopesa`.
5. Customer taps Pay.
6. Backend accepts the payment for presentation/testing and marks it confirmed.
7. Backend creates a charging session and reserves a locker/port.
8. Device polls backend for a command.
9. Device receives charging command payload and controls the locker/port.
10. Device reports charging events back to backend.


## Public Website Payment APIs

These APIs are called by the customer website, not by the IoT device.

### Resolve QR

```http
POST /public/charging/qr/resolve
Content-Type: application/json
```

Request:

```json
{
  "qrToken": "cmsqr_dVkGhCMkpUw2wAh5ZkSGHU_D5FbncfcQ"
}
```

Response includes available packages and a short-lived `checkoutToken`.

Important fields:

```json
{
  "packages": [
    {
      "publicPackageId": "QUICK-200",
      "priceMinor": "200",
      "currency": "TZS",
      "durationSeconds": 900
    },
    {
      "publicPackageId": "STANDARD-500",
      "priceMinor": "500",
      "currency": "TZS",
      "durationSeconds": 2700
    }
  ],
  "checkoutToken": "short-lived-token"
}
```

### Create Payment

```http
POST /public/charging/payments
Content-Type: application/json
X-Checkout-Token: <checkoutToken>
```

Request:

```json
{
  "packageId": "QUICK-200",
  "paymentMethod": "mpesa",
  "idempotencyKey": "4a95b078-0538-44df-b6da-9162515691f8"
}
```

Allowed `paymentMethod` values:

```text
mpesa
mixx_by_yas
airtel_money
halopesa
```

Current presentation behavior:

- Backend accepts the payment immediately.
- Payment status returns as `confirmed`.
- No real mobile money collection is performed yet.
- This lets the website and IoT device flow be tested end-to-end.

Response:

```json
{
  "paymentReference": "PAY-...",
  "merchantReference": "PAY-PAY-...",
  "amountMinor": "200",
  "currency": "TZS",
  "provider": "mpesa",
  "status": "confirmed",
  "customerFlowToken": "customer-flow-token"
}
```

### Check Payment Status

```http
GET /public/charging/payments/{paymentReference}/status
X-Customer-Flow-Token: <customerFlowToken>
```

When payment is confirmed, backend creates or returns a charging session.

Response:

```json
{
  "paymentReference": "PAY-...",
  "status": "confirmed",
  "amountMinor": "200",
  "currency": "TZS",
  "sessionReference": "SESSION-...",
  "canClaimLockerPin": true
}
```

## Device APIs

These APIs are for the IoT device.

Device routes require device authentication.

```http
Authorization: DeviceApiKey <keyId.secret>
```

The IoT person needs a real device credential from the admin/backend setup.

### Poll Commands

```http
GET /device-ingestion/commands
Authorization: DeviceApiKey <keyId.secret>
```

Response:

```json
{
  "commands": [
    {
      "id": "command-uuid",
      "commandType": "charging.prepare",
      "payload": {
        "sessionReference": "SESSION-...",
        "lockerNumber": 1,
        "portNumber": 1,
        "durationSeconds": 900,
        "accessCodeVerifier": "hmac-sha256:<hex>"
      },
      "requestedAt": "2026-08-13T11:30:00.000Z",
      "expiresAt": "2026-08-13T11:40:00.000Z"
    }
  ]
}
```

The device should:

- Open the assigned locker only after valid PIN verification.
- Start the assigned charging relay after phone deposit/locker-close checks.
- Charge for `durationSeconds`.
- Report status/events back to backend.

### Send Device Event

```http
POST /device-ingestion/events
Content-Type: application/json
Authorization: DeviceApiKey <keyId.secret>
```

Event envelope:

```json
{
  "externalEventId": "DEVICE-001-000001",
  "eventCategory": "session",
  "eventType": "charging.started",
  "sequenceNumber": 1,
  "occurredAt": "2026-08-13T11:31:00.000Z",
  "firmwareVersion": "esp32-v1",
  "payload": {
    "sessionReference": "SESSION-...",
    "lockerNumber": 1,
    "portNumber": 1
  }
}
```

## Data Ownership

The backend owns:

- Price/package amount
- Payment status
- Session reference
- Locker/port reservation
- Duration
- Access-code verifier

The device owns:

- Physical relay control
- Locker lock control
- Keypad input
- Charging progress events
- Completion/failure events

The device must not invent amount, duration, session reference, or payment
status.

## File For IoT Person

Use this JSON contract file:

```text
docs/payment-flow-device-payload.json
```

It shows the full payment-accepted payload and the device command/event payloads
that need for Iot

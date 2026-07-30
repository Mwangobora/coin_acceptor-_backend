# Hardware Integration Contract

## 1. Current prototype hardware

The active prototype is an offline ESP32-based smart charger with one coin
acceptor input, two secure lockers, two charging relays, two locker-lock
relays, a 16x2 I2C LCD, and a 4x3 keypad.

## 2. Current GPIO and component mapping

- Coin input: GPIO 12
- Charging relay 1: GPIO 26
- Charging relay 2: GPIO 25
- Locker relay 1: GPIO 33
- Locker relay 2: GPIO 32
- Keypad row pins: 13, 14, 16, 17
- Keypad column pins: 18, 19, 23
- LCD address: `0x27`
- LCD size: `16x2`

## 3. Current coin pulse mapping

The prototype uses versioned device-scoped `system_settings` under
`coin.pulse_mapping`.

- 4 pulses -> TZS 50 -> 20 seconds
- 8 pulses -> TZS 100 -> 40 seconds
- 12 pulses -> TZS 200 -> 60 seconds
- 16 pulses -> TZS 500 -> 120 seconds

The firmware groups pulses using a settle window of about 500 ms.

## 4. Current two-locker structure

The demonstration prototype contains exactly one device, two lockers, and one
charging port per locker.

- Locker 1: `Slot 1`, charging channel `RELAY1_GPIO26`
- Locker 2: `Slot 2`, charging channel `RELAY2_GPIO25`

## 5. Current offline behaviour

The current firmware is local-only. It accepts coins, controls relays, displays
messages on the LCD, reads keypad input, and tracks local charging time.

The current firmware does not yet contain:

- Wi-Fi communication
- HTTP or MQTT communication
- Device authentication
- Event submission
- Command polling
- QR payment
- Backend telemetry
- Backend-controlled sessions
- Backend-generated four-digit locker PIN verification

## 6. Planned backend integration

The planned connected version will authenticate the device, accept events,
resolve payment pulse mappings from backend settings, create charging sessions,
queue device commands, and reconcile charging completion.

## 7. Device authentication

The backend already supports API-key and HMAC device authentication. The
prototype firmware does not yet implement either flow.

## 8. Device event envelope

The event envelope remains:

```json
{
  "externalEventId": "unique-per-device",
  "eventCategory": "payment",
  "eventType": "payment.coin_inserted",
  "sequenceNumber": 1,
  "occurredAt": "ISO-8601 UTC",
  "firmwareVersion": "prototype-1.0",
  "payload": {}
}
```

## 9. Supported event types

Initial firmware contract event types:

- `device.heartbeat`
- `payment.coin_inserted`
- `locker.status`
- `locker.code_verified`
- `locker.code_rejected`
- `charging.started`
- `charging.progress`
- `charging.completed`
- `charging.failed`
- `command.acknowledged`

`payment.coin_inserted` payload:

```json
{
  "paymentReference": "PAY-...",
  "pulseCount": 4,
  "insertedAt": "ISO-8601 UTC"
}
```

The backend derives `amountMinor`, `currency`, and `durationSeconds` from the
active pulse mapping. The device must not send trusted monetary values.

## 10. Backend command envelope

Required connected-firmware command types:

- `charging.prepare`
- `charging.start`
- `charging.stop`
- `locker.open`
- `device.status_request`
- `device.sync_configuration`

`charging.prepare` payload:

```json
{
  "sessionReference": "SESSION-...",
  "lockerNumber": 1,
  "portNumber": 1,
  "durationSeconds": 1200,
  "accessCodeVerifier": "hmac-sha256:..."
}
```

Plaintext locker access codes must never be persisted in command payloads.
`charging.prepare` is queued only after the customer claims the backend-created
PIN. Payment confirmation must not queue `charging.start`.

## 11. Charging-session sequence

Final QR/mobile-money online sequence:

1. Customer confirms payment through the browser flow.
2. Backend reserves one locker and one charging port.
3. Backend creates a pending charging session.
4. Customer claims the four-digit locker PIN.
5. Backend stores only `hmac-sha256:<hex>` and queues `charging.prepare`.
6. Device receives `charging.prepare`.
7. First valid PIN entry opens the locker for phone deposit.
8. Device confirms locker opened, phone connected where detectable, and locker
   closed.
9. Only then may the device energize the matching relay and report
   `charging.started`.
10. Device stops the relay when charging time ends and keeps the locker locked.
11. The same PIN opens the locker for phone collection.
12. After phone collection and locker closure, the backend invalidates access
    usage, completes the session, and releases the locker and port.
13. During active charging, the device must prevent repeated locker opens unless
    a separately authorized early-collection workflow exists.

## 12. Locker-code security

The backend generates the four-digit customer PIN. The ESP32 must not generate
the customer PIN with Arduino `random()` or any local pseudo-random flow. The
device receives only `accessCodeVerifier`, verifies keypad input securely, and
must never log or transmit the plaintext PIN.

## 13. Idempotency rules

- `externalEventId` must be unique per device.
- `sequenceNumber`, when present, must also be unique per device.
- Command `idempotencyKey` reuse is allowed only for identical command input.

## 14. Offline and retry behaviour

The current firmware is offline and cannot retry against the backend. The
connected firmware must queue unsent events, retry safely, and avoid trusting
duplicate submissions without idempotency checks.

## 15. Firmware changes still required

- Add Wi-Fi connectivity
- Add backend authentication
- Submit event envelopes
- Poll pending commands
- Acknowledge command execution
- Support backend configuration sync
- Emit charging lifecycle events
- Implement backend-generated PIN verifier checks
- Enforce deposit and collection phases without repeated active-charging opens

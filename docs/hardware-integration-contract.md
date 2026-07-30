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
messages on the LCD, reads keypad input, tracks local charging time, and
generates six-digit locker codes inside device memory.

The current firmware does not yet contain:

- Wi-Fi communication
- HTTP or MQTT communication
- Device authentication
- Event submission
- Command polling
- QR payment
- Backend telemetry
- Backend-controlled sessions

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

- `charging.start`
- `charging.stop`
- `locker.open`
- `device.status_request`
- `device.sync_configuration`

`charging.start` payload:

```json
{
  "sessionReference": "SESSION-...",
  "lockerNumber": 1,
  "portNumber": 1,
  "durationSeconds": 20
}
```

Plaintext locker access codes must not be persisted in command payloads.

## 11. Charging-session sequence

Planned online sequence:

1. Customer starts a coin-payment operation.
2. Device receives coin pulses.
3. Device sends `payment.coin_inserted`.
4. Backend validates the active pulse mapping.
5. Backend confirms the payment.
6. Backend selects an available locker and charging port.
7. Backend creates a charging session.
8. Backend queues `charging.start`.
9. Device receives the command.
10. Device energizes the matching relay.
11. Device generates and displays the locker code.
12. Device sends `charging.started`.
13. Device sends `charging.progress`.
14. Device stops charging on expiry.
15. Device sends `charging.completed`.
16. Backend marks the session completed.
17. Locker returns to available after collection.

## 12. Locker-code security

The prototype generates a six-digit code locally. The plaintext code stays on
the device, is shown on the LCD, and must not be sent to the backend or normal
logs. The backend stores only `accessCodeHash`. Arduino `random()` must later
be replaced with ESP32 secure randomness.

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
- Replace insecure random code generation

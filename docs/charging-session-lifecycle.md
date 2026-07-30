# Charging Session Lifecycle

Public customer sessions are created only after confirmed QR payment.

## States

- `pending`: payment confirmed and resources reserved.
- `awaiting_device`: device preparation or customer connection is in progress.
- `active`: charging is running.
- `paused`: charging is temporarily paused.
- `completed`: charging completed normally.
- `stopped`, `failed`, `cancelled`, `expired`: terminal or exception states.

## Allocation

After confirmation, the backend row-locks available lockers and ports, prefers
the lowest locker number, marks the locker `reserved`, creates a pending
session, and links the confirmed payment. Active-session unique indexes prevent
the same locker or port from being allocated twice.

If no slot is available, the confirmed payment remains confirmed and a
deduplicated operational alert is created.

## Customer Guidance

Public session status maps internal states to safe customer guidance such as
`payment_confirmed`, `enter_access_code`, `connect_phone`, `charging`,
`collect_phone`, `session_finished`, and `device_error`.

Public responses never expose access-code hashes, device credentials,
administrative metadata, command payloads, or raw event payloads.

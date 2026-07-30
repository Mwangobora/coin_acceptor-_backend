# Charging Session Lifecycle

Public customer sessions are created only after confirmed QR payment. Payment
confirmation reserves resources only; it must not start the relay.

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

No `charging.start` command is queued during payment confirmation.

If no slot is available, the confirmed payment remains confirmed and a
deduplicated operational alert is created.

## Customer Guidance

Public session status maps internal states to safe customer guidance such as
`payment_confirmed`, `enter_access_code`, `connect_phone`, `charging`,
`collect_phone`, `session_finished`, and `device_error`.

Public responses never expose access-code hashes, device credentials,
administrative metadata, command payloads, or raw event payloads.

## Final Device Workflow

1. Customer claims the four-digit PIN.
2. Backend stores only the HMAC verifier and queues `charging.prepare`.
3. `charging.prepare` contains `sessionReference`, `lockerNumber`,
   `portNumber`, charging duration, and `accessCodeVerifier`.
4. `charging.prepare` never contains the plaintext PIN.
5. First valid PIN entry opens the locker for phone deposit.
6. Charging begins only after the device confirms locker opened, phone connected
   where detectable, and locker closed.
7. The relay turns off when charging time ends, but the locker remains locked.
8. The same PIN opens the locker for phone collection.
9. After phone collection and locker closure, access-code usage is invalidated,
   the session completes, and locker/port resources are released.
10. During active charging, repeated locker opens are blocked unless an
    explicitly authorized early-collection workflow is implemented.

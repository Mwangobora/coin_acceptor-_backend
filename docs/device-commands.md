# Device Commands

Device commands let administrators queue safe backend-to-device instructions and
let embedded hardware poll for its own pending work.

## Supported Command Types

- `device.status_request`
- `device.restart`
- `device.sync_configuration`
- `locker.emergency_open`
- `locker.lock`
- `port.power_on`
- `port.power_off`

Command payloads must be JSON objects. Payloads containing credential-like
fields such as `secret`, `token`, `password`, `apiKey`, or private keys are
rejected or removed from administrative responses.

## Create A Command

```http
POST /api/v1/devices/{deviceId}/commands
Cookie: admin_session=...
Content-Type: application/json

{
  "commandType": "locker.lock",
  "payload": { "lockerId": "00000000-0000-0000-0000-000000000000" },
  "idempotencyKey": "dispatch-123",
  "availableAt": "2026-07-19T10:00:00.000Z",
  "expiresAt": "2026-07-19T10:05:00.000Z",
  "reason": "Maintenance reset"
}
```

If `idempotencyKey` is omitted, the backend generates one. Reusing a key with
the same command returns the existing command. Reusing it with different input
returns `409 Conflict`.

High-risk `locker.emergency_open` commands require `lockers.emergency_open` and
a nonblank `reason`. Restart and configuration commands require
`devices.restart` and `devices.configure` respectively.

## Poll Commands

Embedded devices use the existing device authentication scheme.

```http
GET /api/v1/device-ingestion/commands
Authorization: DeviceApiKey key-id.fake-secret
```

Only commands for the authenticated device are returned. Eligible commands are
`queued`, available now, and not expired. Delivery atomically marks returned
commands as `sent` and sets `sentAt`.

Response:

```json
{
  "commands": [
    {
      "id": "00000000-0000-0000-0000-000000000000",
      "commandType": "locker.lock",
      "payload": { "lockerId": "00000000-0000-0000-0000-000000000000" },
      "requestedAt": "2026-07-19T10:00:00.000Z",
      "expiresAt": "2026-07-19T10:05:00.000Z"
    }
  ]
}
```

## Acknowledge Commands

Acknowledgements use the existing device event ingestion endpoint. Do not create
or use a second acknowledgement protocol.

```http
POST /api/v1/device-ingestion/events
Authorization: DeviceApiKey key-id.fake-secret
Content-Type: application/json

{
  "externalEventId": "ack-123",
  "eventCategory": "command_ack",
  "eventType": "device.command_ack",
  "occurredAt": "2026-07-19T10:00:30.000Z",
  "payload": {
    "commandId": "00000000-0000-0000-0000-000000000000",
    "result": "completed",
    "response": { "ok": true }
  }
}
```

Allowed results are `acknowledged`, `completed`, and `failed`. The command must
belong to the authenticated device and must already be `sent`.

## Status Rules

- `queued` commands may be delivered or cancelled.
- Delivered commands move to `sent`.
- Sent commands may become `acknowledged`, `completed`, or `failed`.
- `completed`, `failed`, `expired`, and `cancelled` are terminal.
- Completed commands cannot return to `acknowledged`.
- Expiry processing marks expired `queued` or `sent` commands as `expired` in
  locked batches.

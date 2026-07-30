# Device Commands

Device commands let administrators queue safe backend-to-device instructions and
let embedded hardware poll for its own pending work.

## Prototype Command Types

- `device.status_request`
- `device.sync_configuration`
- `charging.start`
- `charging.stop`
- `locker.open`

Command payloads must be JSON objects. Payloads containing credential-like
fields such as `secret`, `token`, `password`, `apiKey`, private keys, or
plaintext locker access codes are rejected or removed from administrative
responses.

## Create A Command

```http
POST /api/v1/devices/{deviceId}/commands
Cookie: admin_session=...
Content-Type: application/json

{
  "commandType": "charging.start",
  "payload": {
    "sessionReference": "SESSION-123",
    "lockerNumber": 1,
    "portNumber": 1,
    "durationSeconds": 20
  },
  "idempotencyKey": "dispatch-123",
  "availableAt": "2026-07-19T10:00:00.000Z",
  "expiresAt": "2026-07-19T10:05:00.000Z",
  "reason": "Prototype test dispatch"
}
```

If `idempotencyKey` is omitted, the backend generates one. Reusing a key with
the same command returns the existing command. Reusing it with different input
returns `409 Conflict`.

Configuration commands require `devices.configure`. The backend does not persist
plaintext locker codes inside command payloads.

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
      "commandType": "charging.start",
      "payload": {
        "sessionReference": "SESSION-123",
        "lockerNumber": 1,
        "portNumber": 1,
        "durationSeconds": 20
      },
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
  "eventCategory": "command",
  "eventType": "command.acknowledged",
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

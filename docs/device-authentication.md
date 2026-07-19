# Embedded Device Authentication

Device ingestion endpoints do not accept administrator JWT cookies or bearer
tokens. Devices authenticate with active `device_credentials` records, and the
server derives `deviceId` and `stationId` from the credential.

Certificate credentials can exist in the database, but this application does
not trust arbitrary certificate-fingerprint HTTP headers. Certificate-based
device authentication should only be enabled behind a trusted reverse proxy or
load balancer that performs mutual TLS and forwards verified certificate
identity.

## API Key

Use:

```http
Authorization: DeviceApiKey cred_api_key_example.cak_fake_device_secret
Content-Type: application/json
```

Example:

```bash
curl -X POST http://localhost:4000/api/v1/device-ingestion/events \
  -H 'Authorization: DeviceApiKey cred_api_key_example.cak_fake_device_secret' \
  -H 'Content-Type: application/json' \
  -d '{"externalEventId":"evt-001","eventCategory":"heartbeat","eventType":"device.heartbeat","occurredAt":"2026-07-19T10:00:00.000Z","payload":{"operationalStatus":"idle","powerSource":"grid"}}'
```

The plaintext secret is shown only once when the credential is created. The
database stores only an Argon2 hash.

## HMAC

Headers:

```http
X-Device-Key-Id: cred_hmac_example
X-Device-Timestamp: 2026-07-19T10:00:00.000Z
X-Device-Nonce: fake-nonce-001
X-Device-Signature: fakehexsignature
Content-Type: application/json
```

Canonical string:

```text
HTTP_METHOD
REQUEST_PATH
TIMESTAMP
NONCE
SHA256_RAW_BODY
```

`REQUEST_PATH` is the path without the query string, for example
`/api/v1/device-ingestion/events`. Sign the canonical string with HMAC-SHA256
using the device HMAC secret and send the signature as lowercase hex.

Example:

```bash
BODY='{"externalEventId":"evt-002","eventCategory":"heartbeat","eventType":"device.heartbeat","occurredAt":"2026-07-19T10:00:00.000Z","payload":{}}'
TIMESTAMP='2026-07-19T10:00:00.000Z'
NONCE='fake-nonce-002'
BODY_HASH=$(printf '%s' "$BODY" | sha256sum | awk '{print $1}')
CANONICAL="POST
/api/v1/device-ingestion/events
$TIMESTAMP
$NONCE
$BODY_HASH"
SIGNATURE=$(printf '%s' "$CANONICAL" | openssl dgst -sha256 -hmac 'fake_hmac_secret' -hex | awk '{print $2}')

curl -X POST http://localhost:4000/api/v1/device-ingestion/events \
  -H "X-Device-Key-Id: cred_hmac_example" \
  -H "X-Device-Timestamp: $TIMESTAMP" \
  -H "X-Device-Nonce: $NONCE" \
  -H "X-Device-Signature: $SIGNATURE" \
  -H 'Content-Type: application/json' \
  -d "$BODY"
```

Redis stores used nonces with `SET NX` under
`device-auth:nonce:{credentialId}:{nonce}` for the replay window. If Redis is
unavailable, HMAC-authenticated writes fail closed.

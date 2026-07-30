# Locker Access Code Security

The locker PIN is a backend-generated six-digit numeric code. It is not an
M-Pesa transaction code and is not derived from the payment reference.

## One-Time Display

The plaintext PIN is generated only when the customer calls:

```text
POST /api/v1/public/charging/sessions/:sessionReference/access-code
```

The backend returns the plaintext PIN in that successful response exactly once.
Repeated claims return `409 ACCESS_CODE_ALREADY_CLAIMED`.

## Storage

Plaintext PINs are not stored in PostgreSQL, Redis, payment metadata, session
metadata, audit logs, device events, application logs, provider data, or system
settings.

`charging_sessions.access_code_hash` stores a verifier:

```text
hmac-sha256:<hex>
```

## Verifier Input

The canonical verifier input is:

```text
{sessionReference}:{lockerNumber}:{plaintextPin}
```

The verifier uses the active device HMAC secret. Device commands receive only
the verifier, never the plaintext PIN.

## Command Payload

```json
{
  "sessionReference": "SESSION-...",
  "lockerNumber": 1,
  "portNumber": 1,
  "durationSeconds": 1200,
  "accessCodeVerifier": "hmac-sha256:..."
}
```

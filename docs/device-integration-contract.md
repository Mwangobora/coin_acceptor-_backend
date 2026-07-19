# Device Integration Contract

This document lists proposed device communication topics that must be confirmed
with the embedded developer before DTOs and routes are finalized.

## Proposed Event Categories

- Device heartbeat
- Device online/offline event
- Coin accepted
- Coin rejected
- QR payment confirmed
- QR payment failed
- Charging session started
- Charging session progress
- Charging session completed
- Charging session stopped
- Power source changed
- Backup battery activated
- Low battery detected
- Locker opened
- Locker closed
- Locker locked
- Locker unlocked
- Charging-port fault
- Overcurrent detected
- Device fault
- Security alert

## Proposed Event Envelope

These fields are PROPOSED, not final:

- `eventId`
- `deviceId`
- `stationId`
- `eventType`
- `occurredAt`
- `sequenceNumber`
- `firmwareVersion`
- `payload`

The `payload` shape is intentionally not defined yet because hardware-specific
fields must come from the embedded contract.

## Decisions Required

1. Will the ESP32 use HTTP, HTTPS, MQTT, or another protocol?
2. How will the backend identify each physical device?
3. How will the device authenticate?
4. Will authentication use an API key, HMAC signature, or certificate?
5. Will the embedded device generate event IDs?
6. How will duplicate events be detected?
7. Will timestamps come from the device or backend?
8. What timezone will the device use?
9. What happens when internet connectivity is unavailable?
10. Will the device queue and retry unsent events?
11. What is the retry interval?
12. What response format does the firmware expect?
13. How will commands be sent from the backend to the device?
14. Can the device receive configuration updates?
15. Which device data is measured versus calculated?

## Boundary Notes

Embedded-device APIs and admin frontend APIs are separate trust boundaries.
Device ingestion receives and validates device communication, then routes valid
events to the owning business module. It must not become the owner of payments,
charging sessions, lockers, or alerts.

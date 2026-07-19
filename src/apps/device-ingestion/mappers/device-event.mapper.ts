import type { device_events } from '@prisma/client';

import type { DeviceEventIngestResponse } from '../types/device-event-response.type';

export function mapIngestResponse(
  event: device_events,
  duplicate: boolean,
): DeviceEventIngestResponse {
  return {
    eventId: event.id,
    processingStatus: event.processing_status,
    duplicate,
    receivedAt: event.received_at,
  };
}

export function mapDeviceEvent(event: device_events, includePayload = false) {
  return {
    id: event.id,
    stationId: event.station_id,
    deviceId: event.device_id,
    externalEventId: event.external_event_id,
    eventCategory: event.event_category,
    eventType: event.event_type,
    sequenceNumber: event.sequence_number?.toString() ?? null,
    occurredAt: event.occurred_at,
    receivedAt: event.received_at,
    firmwareVersion: event.firmware_version,
    payloadSha256: event.payload_sha256,
    processingStatus: event.processing_status,
    processedAt: event.processed_at,
    failureCode: event.failure_code,
    failureReason: event.failure_reason,
    requestId: event.request_id,
    sourceIp: event.source_ip,
    ...(includePayload ? { payload: event.payload } : {}),
  };
}

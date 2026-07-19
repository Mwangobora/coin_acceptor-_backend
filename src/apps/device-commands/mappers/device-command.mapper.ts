import type { device_commands } from '@prisma/client';

import type {
  DeviceCommandPollItem,
  DeviceCommandResponse,
} from '../types/device-command-response.type';
import { sanitizeJson } from '../services/command-payload-sanitizer.service';

export function mapDeviceCommand(
  command: device_commands,
): DeviceCommandResponse {
  return {
    id: command.id,
    stationId: command.station_id,
    deviceId: command.device_id,
    commandType: command.command_type,
    payload: sanitizeJson(command.payload),
    status: command.status,
    idempotencyKey: command.idempotency_key,
    requestedByUserId: command.requested_by_user_id,
    requestedAt: command.requested_at,
    availableAt: command.available_at,
    sentAt: command.sent_at,
    acknowledgedAt: command.acknowledged_at,
    completedAt: command.completed_at,
    expiresAt: command.expires_at,
    failureCode: command.failure_code,
    failureReason: command.failure_reason,
    deviceResponse: sanitizeJson(command.device_response),
    acknowledgementEventId: command.acknowledgement_event_id,
  };
}

export function mapPollCommand(
  command: device_commands,
): DeviceCommandPollItem {
  return {
    id: command.id,
    commandType: command.command_type,
    payload: sanitizeJson(command.payload),
    requestedAt: command.requested_at,
    expiresAt: command.expires_at,
  };
}

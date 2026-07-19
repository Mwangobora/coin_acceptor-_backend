import type { audit_logs } from '@prisma/client';

export function mapAuditLog(log: audit_logs) {
  return {
    id: log.id,
    actorType: log.actor_type,
    actorUserId: log.actor_user_id,
    actorDeviceId: log.actor_device_id,
    stationId: log.station_id,
    action: log.action,
    entityType: log.entity_type,
    entityId: log.entity_id,
    requestId: log.request_id,
    ipAddress: log.ip_address,
    userAgent: log.user_agent,
    reason: log.reason,
    beforeData: sanitizeJson(log.before_data),
    afterData: sanitizeJson(log.after_data),
    metadata: sanitizeJson(log.metadata),
    occurredAt: log.occurred_at.toISOString(),
  };
}

function sanitizeJson(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sanitizeJson);
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !isSensitiveKey(key))
      .map(([key, item]) => [key, sanitizeJson(item)]),
  );
}

function isSensitiveKey(key: string): boolean {
  return /(password|token|cookie|secret|hash|credential)/i.test(key);
}

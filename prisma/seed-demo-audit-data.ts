import { ids } from './seed-demo-ids';

export function auditLogs(adminId: string) {
  return [
    audit(0, 'settings.update', 'system_settings', ids.settings[0], adminId),
    audit(1, 'alerts.acknowledge', 'alerts', ids.alerts[2], adminId),
  ];
}

function audit(
  index: number,
  action: string,
  entityType: string,
  entityId: string,
  adminId: string,
) {
  return {
    id: ids.audits[index],
    actor_type: 'user',
    actor_user_id: adminId,
    station_id: index === 1 ? ids.station : null,
    action,
    entity_type: entityType,
    entity_id: entityId,
    request_id: `demo-audit-${index + 1}`,
    reason: 'Demonstration seed data.',
    metadata: { seed: 'demo' },
  };
}

export const DEVICE_EVENT_CATEGORIES = [
  'heartbeat',
  'telemetry',
  'payment',
  'charging',
  'session',
  'locker',
  'power',
  'alert',
  'command',
  'command_ack',
  'system',
] as const;

export const DEVICE_EVENT_TYPE_PATTERN = /^[a-z][a-z0-9_.-]*$/;

export const POWER_SOURCES = [
  'grid',
  'backup_battery',
  'none',
  'unknown',
] as const;

export const OPERATIONAL_STATUSES = [
  'idle',
  'in_use',
  'partially_available',
  'fault',
  'maintenance',
  'offline',
] as const;

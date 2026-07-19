export const DEVICE_COMMAND_TYPES = [
  'device.status_request',
  'device.restart',
  'device.sync_configuration',
  'locker.emergency_open',
  'locker.lock',
  'port.power_on',
  'port.power_off',
] as const;

export const DEVICE_COMMAND_STATUSES = [
  'queued',
  'sent',
  'acknowledged',
  'completed',
  'failed',
  'expired',
  'cancelled',
] as const;

export const COMMAND_ACK_RESULTS = [
  'acknowledged',
  'completed',
  'failed',
] as const;

export type DeviceCommandType = (typeof DEVICE_COMMAND_TYPES)[number];
export type DeviceCommandStatus = (typeof DEVICE_COMMAND_STATUSES)[number];
export type CommandAckResult = (typeof COMMAND_ACK_RESULTS)[number];

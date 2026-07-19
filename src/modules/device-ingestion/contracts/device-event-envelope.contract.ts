import type { DeviceEventCategory } from '../types/device-event-category.type';

export type ProposedDeviceEventEnvelope = {
  eventId: string;
  deviceId: string;
  stationId: string;
  eventType: DeviceEventCategory;
  occurredAt: string;
  sequenceNumber: number;
  firmwareVersion: string;
  payload: unknown;
};

import type { Prisma, device_events } from '@prisma/client';

export type DeviceEventContext = {
  event: device_events;
  payload: Prisma.JsonObject;
  receiptTime: Date;
  sourceIp?: string;
};

export type DeviceEventHandler = {
  canHandle(category: string, eventType: string): boolean;
  handle(context: DeviceEventContext): Promise<void>;
};

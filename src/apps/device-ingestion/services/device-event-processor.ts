import { Injectable } from '@nestjs/common';
import type { Prisma, device_events } from '@prisma/client';

import { ChargingPortEventHandler } from '../handlers/charging-port-event.handler';
import { HeartbeatEventHandler } from '../handlers/heartbeat-event.handler';
import { LockerEventHandler } from '../handlers/locker-event.handler';
import { TelemetryEventHandler } from '../handlers/telemetry-event.handler';
import type { DeviceEventHandler } from '../types/device-event-handler.type';

@Injectable()
export class DeviceEventProcessor {
  private readonly handlers: DeviceEventHandler[];

  constructor(
    heartbeat: HeartbeatEventHandler,
    telemetry: TelemetryEventHandler,
    locker: LockerEventHandler,
    chargingPort: ChargingPortEventHandler,
  ) {
    this.handlers = [heartbeat, telemetry, locker, chargingPort];
  }

  async process(event: device_events): Promise<'processed' | 'received'> {
    const handler = this.handlers.find((item) =>
      item.canHandle(event.event_category, event.event_type),
    );
    if (!handler) return 'received';
    await handler.handle({
      event,
      payload: event.payload as Prisma.JsonObject,
      receiptTime: event.received_at,
      sourceIp: event.source_ip ?? undefined,
    });
    return 'processed';
  }
}

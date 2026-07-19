import { HeartbeatEventHandler } from './heartbeat-event.handler';
import { TelemetryEventHandler } from './telemetry-event.handler';
import { LockerEventHandler } from './locker-event.handler';
import { ChargingPortEventHandler } from './charging-port-event.handler';
import { CommandAckEventHandler } from './command-ack-event.handler';

describe('device event handlers', () => {
  it('updates heartbeat device state', async () => {
    const prisma = prismaMock();
    await new HeartbeatEventHandler(prisma as never).handle(
      context({
        operationalStatus: 'idle',
        powerSource: 'grid',
      }),
    );
    const update = prisma.devices.update as jest.Mock<void, [DeviceUpdate]>;
    const call = update.mock.calls[0]?.[0];
    expect(call.data.connectivity_status).toBe('online');
  });

  it('creates telemetry rows', async () => {
    const prisma = prismaMock();
    await new TelemetryEventHandler(prisma as never).handle(
      context({ batteryPercentage: 55 }),
    );
    expect(prisma.device_telemetry.create).toHaveBeenCalled();
  });

  it('updates lockers and ports through allowlisted state', async () => {
    const prisma = prismaMock();
    await new LockerEventHandler(prisma as never).handle(
      context({ lockerId: 'locker-1' }, 'locker', 'locker.locked'),
    );
    const updateLocker = prisma.lockers.update as jest.Mock<
      void,
      [LockerUpdate]
    >;
    const lockerCall = updateLocker.mock.calls[0]?.[0];
    expect(lockerCall.data.lock_status).toBe('locked');
    await new ChargingPortEventHandler(prisma as never).handle(
      context({ portId: 'port-1' }, 'power', 'port.power_on'),
    );
    const updatePort = prisma.charging_ports.update as jest.Mock<
      void,
      [PortUpdate]
    >;
    const portCall = updatePort.mock.calls[0]?.[0];
    expect(portCall.data.power_state).toBe('on');
  });

  it('delegates command acknowledgements', async () => {
    const commands = { acknowledge: jest.fn() };
    const handler = new CommandAckEventHandler(commands as never);
    expect(handler.canHandle('command_ack')).toBe(true);
    expect(handler.canHandle('heartbeat')).toBe(false);
    await handler.handle(context({}, 'command_ack', 'device.command_ack'));
    expect(commands.acknowledge).toHaveBeenCalled();
  });
});

function prismaMock() {
  return {
    devices: {
      findUniqueOrThrow: jest
        .fn()
        .mockResolvedValue({ lifecycle_status: 'active' }),
      update: jest.fn(),
    },
    device_telemetry: { create: jest.fn() },
    lockers: {
      findFirst: jest.fn().mockResolvedValue({ id: 'locker-1' }),
      update: jest.fn(),
    },
    charging_ports: {
      findFirstOrThrow: jest.fn().mockResolvedValue({ id: 'port-1' }),
      update: jest.fn(),
    },
    charging_sessions: { count: jest.fn().mockResolvedValue(0) },
  };
}

type DeviceUpdate = { data: { connectivity_status?: string } };
type LockerUpdate = { data: { lock_status?: string } };
type PortUpdate = { data: { power_state?: string } };

function context(
  payload: Record<string, unknown>,
  category = 'heartbeat',
  type = 'device.heartbeat',
) {
  return {
    event: {
      id: 'event-1',
      station_id: 'station-1',
      device_id: 'device-1',
      event_category: category,
      event_type: type,
      occurred_at: new Date(),
      received_at: new Date(),
      firmware_version: '1.0.0',
    },
    payload,
    receiptTime: new Date(),
    sourceIp: '127.0.0.1',
  } as never;
}

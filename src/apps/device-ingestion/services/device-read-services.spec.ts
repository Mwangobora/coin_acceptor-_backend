import { DeviceEventReadService } from './device-event-read.service';
import { DeviceTelemetryReadService } from './device-telemetry-read.service';

describe('device ingestion read services', () => {
  it('builds scoped event queries', async () => {
    const prisma = prismaMock();
    await new DeviceEventReadService(prisma as never, scope() as never).list(
      {
        page: 1,
        pageSize: 20,
        sortOrder: 'desc',
        stationId: 'station-1',
        deviceId: 'device-1',
        eventCategory: 'heartbeat',
        eventType: 'device.heartbeat',
        processingStatus: 'processed',
        externalEventId: 'external-1',
        occurredFrom: '2026-01-01T00:00:00.000Z',
        receivedTo: '2026-01-02T00:00:00.000Z',
      },
      { id: 'user-1' } as never,
    );
    const findMany = prisma.device_events.findMany as jest.MockedFunction<
      (args: EventFind) => unknown
    >;
    const call = findMany.mock.calls[0]?.[0];
    expect(call?.where.device_id).toBe('device-1');
    expect(call?.where.event_category).toBe('heartbeat');
  });

  it('reads telemetry details and latest device telemetry', async () => {
    const prisma = prismaMock();
    const service = new DeviceTelemetryReadService(
      prisma as never,
      { ...scope(), requireStation: jest.fn() } as never,
    );

    await service.list(
      {
        page: 1,
        pageSize: 20,
        sortOrder: 'desc',
        powerSource: 'grid',
        faultCode: 'FAULT',
        observedFrom: '2026-01-01T00:00:00.000Z',
      },
      { id: 'user-1' } as never,
    );
    await expect(
      service.get('telemetry-1', { id: 'user-1' } as never),
    ).resolves.toMatchObject({ id: 'telemetry-1' });
    await expect(
      service.latestForDevice('device-1', { id: 'user-1' } as never),
    ).resolves.toMatchObject({ id: 'telemetry-1' });
  });
});

function scope() {
  return {
    deviceWhere: jest.fn().mockResolvedValue({ station_id: 'station-1' }),
  };
}

function prismaMock() {
  const telemetry = {
    id: 'telemetry-1',
    device_event_id: 'event-1',
    station_id: 'station-1',
    device_id: 'device-1',
    observed_at: new Date(),
    power_source: 'grid',
    grid_available: true,
    input_voltage: null,
    output_voltage: null,
    output_current_ma: null,
    output_power_watts: null,
    battery_voltage: null,
    battery_percentage: null,
    temperature_celsius: null,
    connectivity_signal_dbm: null,
    active_session_count: null,
    available_locker_count: null,
    fault_code: null,
    metrics: {},
    created_at: new Date(),
  };
  return {
    $transaction: jest.fn().mockResolvedValue([[], 0]),
    device_events: { findMany: jest.fn(), count: jest.fn() },
    device_telemetry: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn().mockResolvedValue(telemetry),
      findFirst: jest.fn().mockResolvedValue(telemetry),
    },
    devices: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'device-1',
        station_id: 'station-1',
      }),
    },
  };
}

type EventFind = { where: { device_id?: string; event_category?: string } };

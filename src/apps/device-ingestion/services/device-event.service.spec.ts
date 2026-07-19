import { DeviceEventService } from './device-event.service';

describe('DeviceEventService', () => {
  it('persists and processes new events', async () => {
    const event = {
      id: 'event-1',
      processing_status: 'received',
      received_at: new Date(),
    };
    const prisma = {
      device_events: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(event),
        update: jest.fn().mockResolvedValue({
          ...event,
          processing_status: 'processed',
        }),
      },
    };
    const service = new DeviceEventService(
      prisma as never,
      { record: jest.fn() } as never,
      { validate: jest.fn().mockReturnValue(new Date('2026-01-01')) } as never,
      { hash: jest.fn().mockReturnValue('a'.repeat(64)) },
      { process: jest.fn().mockResolvedValue('processed') } as never,
    );

    await expect(
      service.ingest({
        auth: {
          deviceId: 'device-1',
          stationId: 'station-1',
          credentialId: 'credential-1',
          keyId: 'key-1',
          credentialType: 'api_key',
        },
        dto: {
          externalEventId: 'event-1',
          eventCategory: 'heartbeat',
          eventType: 'device.heartbeat',
          occurredAt: '2026-01-01T00:00:00.000Z',
          payload: {},
        },
      }),
    ).resolves.toMatchObject({ eventId: 'event-1', duplicate: false });
  });
});

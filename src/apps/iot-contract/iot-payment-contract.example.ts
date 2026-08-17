export const IOT_PAYMENT_CONTRACT_EXAMPLE = {
  deviceCommand: {
    id: 'command-uuid',
    commandType: 'charging.prepare',
    payload: {
      sessionReference: 'SESSION-...',
      lockerNumber: 1,
      portNumber: 1,
      durationSeconds: 900,
      accessCodeVerifier: 'hmac-sha256:<hex>',
    },
  },
  deviceEvent: {
    externalEventId: 'DEVICE-001-000001',
    eventCategory: 'session',
    eventType: 'charging.started',
    sequenceNumber: 1,
    occurredAt: '2026-08-13T11:31:00.000Z',
    firmwareVersion: 'esp32-v1',
    payload: {
      sessionReference: 'SESSION-...',
      lockerNumber: 1,
      portNumber: 1,
    },
  },
} as const;

export const IOT_API_CONTRACT_EXAMPLE = {
  paymentFlowFirst: IOT_PAYMENT_CONTRACT_EXAMPLE,
  deviceCommands: [
    IOT_PAYMENT_CONTRACT_EXAMPLE.deviceCommand,
    {
      id: 'locker-command-uuid',
      commandType: 'locker.open',
      payload: {
        lockerNumber: 1,
      },
    },
    {
      id: 'stop-command-uuid',
      commandType: 'charging.stop',
      payload: {
        sessionReference: 'SESSION-...',
        lockerNumber: 1,
        portNumber: 1,
      },
    },
  ],
  deviceEvents: [
    {
      externalEventId: 'DEVICE-001-000001',
      eventCategory: 'payment',
      eventType: 'payment.coin_inserted',
      sequenceNumber: 1,
      occurredAt: '2026-08-13T11:31:00.000Z',
      firmwareVersion: 'esp32-v1',
      payload: {
        paymentReference: 'PAY-20260813-ABC123',
        pulseCount: 4,
        insertedAt: '2026-08-13T11:31:00.000Z',
      },
    },
    IOT_PAYMENT_CONTRACT_EXAMPLE.deviceEvent,
    {
      externalEventId: 'DEVICE-001-000002',
      eventCategory: 'locker',
      eventType: 'locker.opened',
      sequenceNumber: 2,
      occurredAt: '2026-08-13T11:32:00.000Z',
      firmwareVersion: 'esp32-v1',
      payload: {
        sessionReference: 'SESSION-...',
        lockerNumber: 1,
        portNumber: 1,
      },
    },
    {
      externalEventId: 'DEVICE-001-000003',
      eventCategory: 'session',
      eventType: 'charging.completed',
      sequenceNumber: 3,
      occurredAt: '2026-08-13T11:47:00.000Z',
      firmwareVersion: 'esp32-v1',
      payload: {
        sessionReference: 'SESSION-...',
        lockerNumber: 1,
        portNumber: 1,
        chargedSeconds: 900,
      },
    },
  ],
} as const;

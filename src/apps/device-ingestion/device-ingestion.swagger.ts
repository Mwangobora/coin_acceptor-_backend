import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';

export function IngestDeviceEventDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Receive event sent by IoT device' }),
    ApiHeader({ name: 'Authorization', example: 'DeviceApiKey key.secret' }),
    ApiBody({
      schema: { type: 'object' },
      examples: deviceEventExamples,
    }),
    ApiCreatedResponse({ description: 'Device event accepted.' }),
  );
}

export function PollDeviceCommandsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Poll commands queued for IoT device after payment/session',
    }),
    ApiHeader({ name: 'Authorization', example: 'DeviceApiKey key.secret' }),
    ApiOkResponse({ schema: { example: commandPollExample } }),
  );
}

const commandPollExample = {
  commands: [
    {
      id: 'command-uuid',
      commandType: 'charging.prepare',
      payload: {
        sessionReference: 'SESSION-...',
        lockerNumber: 1,
        portNumber: 1,
        durationSeconds: 900,
        accessCodeVerifier: 'hmac-sha256:<hex>',
      },
      requestedAt: '2026-08-13T11:30:00.000Z',
      expiresAt: '2026-08-13T11:40:00.000Z',
    },
    {
      id: 'locker-command-uuid',
      commandType: 'locker.open',
      payload: {
        lockerNumber: 1,
      },
      requestedAt: '2026-08-13T11:30:00.000Z',
      expiresAt: '2026-08-13T11:40:00.000Z',
    },
  ],
};

const baseEvent = {
  occurredAt: '2026-08-13T11:31:00.000Z',
  firmwareVersion: 'esp32-v1',
};

const deviceEventExamples = {
  paymentCoinInserted: {
    summary: 'Payment event: coin inserted',
    value: {
      ...baseEvent,
      externalEventId: 'DEVICE-001-000001',
      eventCategory: 'payment',
      eventType: 'payment.coin_inserted',
      sequenceNumber: 1,
      payload: {
        paymentReference: 'PAY-20260813-ABC123',
        pulseCount: 4,
        insertedAt: '2026-08-13T11:31:00.000Z',
      },
    },
  },
  lockerOpened: {
    summary: 'Locker event: locker opened',
    value: sessionEvent('DEVICE-001-000002', 'locker', 'locker.opened', 2),
  },
  lockerClosed: {
    summary: 'Locker event: locker closed',
    value: sessionEvent('DEVICE-001-000003', 'locker', 'locker.closed', 3),
  },
  chargingStarted: {
    summary: 'Charging event: started',
    value: sessionEvent('DEVICE-001-000004', 'session', 'charging.started', 4),
  },
  chargingProgress: {
    summary: 'Charging event: progress',
    value: {
      ...sessionEvent('DEVICE-001-000005', 'session', 'charging.progress', 5),
      payload: {
        sessionReference: 'SESSION-...',
        lockerNumber: 1,
        portNumber: 1,
        elapsedSeconds: 120,
        remainingSeconds: 780,
      },
    },
  },
  chargingCompleted: {
    summary: 'Charging event: completed',
    value: {
      ...sessionEvent('DEVICE-001-000006', 'session', 'charging.completed', 6),
      payload: {
        sessionReference: 'SESSION-...',
        lockerNumber: 1,
        portNumber: 1,
        chargedSeconds: 900,
      },
    },
  },
  commandAcknowledged: {
    summary: 'Command event: acknowledged',
    value: {
      ...baseEvent,
      externalEventId: 'DEVICE-001-000007',
      eventCategory: 'command',
      eventType: 'command.acknowledged',
      sequenceNumber: 7,
      payload: {
        commandId: 'command-uuid',
        result: 'accepted',
      },
    },
  },
  heartbeat: {
    summary: 'Device event: heartbeat',
    value: {
      ...baseEvent,
      externalEventId: 'DEVICE-001-000008',
      eventCategory: 'device',
      eventType: 'device.heartbeat',
      sequenceNumber: 8,
      payload: {
        firmwareVersion: 'esp32-v1',
        signalStrength: -58,
        uptimeSeconds: 3600,
      },
    },
  },
};

function sessionEvent(
  externalEventId: string,
  eventCategory: string,
  eventType: string,
  sequenceNumber: number,
) {
  return {
    ...baseEvent,
    externalEventId,
    eventCategory,
    eventType,
    sequenceNumber,
    payload: {
      sessionReference: 'SESSION-...',
      lockerNumber: 1,
      portNumber: 1,
    },
  };
}

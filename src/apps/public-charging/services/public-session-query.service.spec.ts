import { NotFoundException } from '@nestjs/common';

import { PublicSessionQueryService } from './public-session-query.service';

describe('PublicSessionQueryService', () => {
  it.each([
    ['pending', null, 'payment_confirmed'],
    ['pending', 'hmac-sha256:abc', 'enter_access_code'],
    ['awaiting_device', 'hmac-sha256:abc', 'connect_phone'],
    ['active', 'hmac-sha256:abc', 'charging'],
    ['completed', 'hmac-sha256:abc', 'collect_phone'],
    ['cancelled', 'hmac-sha256:abc', 'session_finished'],
    ['failed', 'hmac-sha256:abc', 'device_error'],
  ])('maps %s sessions to safe guidance', async (status, hash, guidance) => {
    const service = serviceWith(sessionRow(status, hash));

    await expect(service.get('SESSION-1', 'flow-token')).resolves.toMatchObject(
      {
        sessionReference: 'SESSION-1',
        guidance,
        stationName: 'Station A',
        deviceName: 'Device A',
        lockerNumber: 1,
        portNumber: 1,
      },
    );
  });

  it('uses a safe fallback when station name is unavailable', async () => {
    const service = serviceWith(sessionRow('active', 'hmac-sha256:abc'), null);

    await expect(service.get('SESSION-1', 'flow-token')).resolves.toMatchObject(
      {
        stationName: 'Charging station',
      },
    );
  });

  it('rejects invalid flow/session/payment combinations generically', async () => {
    await expect(
      serviceWith(sessionRow('active', 'hash'), undefined, 'OTHER').get(
        'SESSION-1',
        'flow-token',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      serviceWith(null).get('SESSION-1', 'flow-token'),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      serviceWith({
        ...sessionRow('active', 'hash'),
        charging_session_payments: [],
      }).get('SESSION-1', 'flow-token'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

function serviceWith(
  session: unknown,
  station: { name: string } | null | undefined = { name: 'Station A' },
  flowSessionReference = 'SESSION-1',
) {
  const prisma = {
    charging_sessions: { findUnique: jest.fn().mockResolvedValue(session) },
    stations: { findUnique: jest.fn().mockResolvedValue(station) },
  };
  const flows = {
    require: jest.fn().mockResolvedValue({
      sessionReference: flowSessionReference,
      paymentReference: 'PAY-1',
    }),
  };
  return new PublicSessionQueryService(prisma as never, flows as never);
}

function sessionRow(status: string, accessCodeHash: string | null) {
  return {
    session_reference: 'SESSION-1',
    status,
    station_id: 'station-1',
    currency: 'TZS',
    purchased_duration_seconds: 120,
    remaining_seconds: 60,
    total_paid_minor: 500n,
    started_at: null,
    expected_end_at: null,
    ended_at: null,
    access_code_hash: accessCodeHash,
    lockers: { locker_number: 1 },
    charging_ports: { port_number: 1 },
    devices: { name: 'Device A' },
    charging_session_payments: [
      {
        payments: {
          payment_reference: 'PAY-1',
          package_name_snapshot: 'Demo Package',
        },
      },
    ],
  };
}

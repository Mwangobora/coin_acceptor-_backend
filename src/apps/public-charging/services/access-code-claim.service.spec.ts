import { ConflictException, NotFoundException } from '@nestjs/common';

import { AccessCodeClaimService } from './access-code-claim.service';

describe('AccessCodeClaimService', () => {
  it('rejects missing or mismatched sessions generically', async () => {
    await expect(
      serviceWith(null).claim('SESSION-1', 'flow'),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      serviceWith(sessionRow('pending', null), 'OTHER').claim(
        'SESSION-1',
        'flow',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects terminal sessions before generating a PIN', async () => {
    await expect(
      serviceWith(sessionRow('completed', null)).claim('SESSION-1', 'flow'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects replay claims and records a safe audit event', async () => {
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    await expect(
      serviceWith(
        sessionRow('pending', 'hmac-sha256:abc'),
        'SESSION-1',
        audit,
      ).claim('SESSION-1', 'flow'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'public_access_code.replay_attempt' }),
    );
  });
});

function serviceWith(
  session: unknown,
  flowSessionReference = 'SESSION-1',
  audit = { record: jest.fn().mockResolvedValue(undefined) },
) {
  const prisma = {
    charging_sessions: { findUnique: jest.fn().mockResolvedValue(session) },
    charging_session_payments: {
      findFirst: jest.fn().mockResolvedValue({ id: 'link-1' }),
    },
  };
  const flows = {
    require: jest.fn().mockResolvedValue({
      sessionReference: flowSessionReference,
      paymentReference: 'PAY-1',
    }),
  };
  return new AccessCodeClaimService(
    prisma as never,
    flows as never,
    { generate: jest.fn().mockReturnValue('4839') },
    { verifier: jest.fn().mockResolvedValue('hmac-sha256:abc') } as never,
    audit as never,
  );
}

function sessionRow(status: string, accessCodeHash: string | null) {
  return {
    id: 'session-id',
    session_reference: 'SESSION-1',
    station_id: 'station-1',
    device_id: 'device-1',
    status,
    access_code_hash: accessCodeHash,
    purchased_duration_seconds: 120,
    lockers: { locker_number: 1 },
    charging_ports: { port_number: 1 },
  };
}

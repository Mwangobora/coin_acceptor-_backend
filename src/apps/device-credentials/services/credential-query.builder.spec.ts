import { CredentialQueryBuilder } from './credential-query.builder';

describe('CredentialQueryBuilder', () => {
  const builder = new CredentialQueryBuilder();

  it('builds all optional filters', () => {
    expect(
      builder.filterWhere({
        page: 1,
        pageSize: 20,
        sortOrder: 'asc',
        deviceId: 'device-1',
        credentialType: 'api_key',
        status: 'active',
        validFrom: '2026-01-01T00:00:00.000Z',
        expiresBefore: '2026-12-31T00:00:00.000Z',
      }),
    ).toEqual({
      device_id: 'device-1',
      credential_type: 'api_key',
      status: 'active',
      valid_from: { gte: new Date('2026-01-01T00:00:00.000Z') },
      expires_at: { lte: new Date('2026-12-31T00:00:00.000Z') },
    });
  });

  it('falls back to created date sorting', () => {
    expect(builder.orderBy('unknown', 'desc')).toEqual([
      { created_at: 'desc' },
      { id: 'asc' },
    ]);
  });
});

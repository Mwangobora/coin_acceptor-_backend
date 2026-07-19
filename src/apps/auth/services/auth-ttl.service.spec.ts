import { AuthTtlService } from './auth-ttl.service';

describe('AuthTtlService', () => {
  const service = new AuthTtlService();

  it('converts supported TTL units to milliseconds', () => {
    expect(service.toMilliseconds('15s')).toBe(15_000);
    expect(service.toMilliseconds('2m')).toBe(120_000);
    expect(service.toMilliseconds('3h')).toBe(10_800_000);
    expect(service.toMilliseconds('7d')).toBe(604_800_000);
  });

  it('rejects invalid TTL strings', () => {
    expect(() => service.toMilliseconds('forever')).toThrow(
      'Invalid TTL value',
    );
  });

  it('computes an expiry from a provided base date', () => {
    const from = new Date('2026-01-01T00:00:00.000Z');

    expect(service.expiresAt('1h', from).toISOString()).toBe(
      '2026-01-01T01:00:00.000Z',
    );
  });
});

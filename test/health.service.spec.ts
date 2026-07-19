import { HealthService } from '../src/modules/health/health.service';

describe('HealthService', () => {
  it('returns service health status', () => {
    const response = new HealthService().getHealth();

    expect(response.status).toBe('ok');
    expect(response.service).toBe('charging-system-api');
    expect(Number.isNaN(Date.parse(response.timestamp))).toBe(false);
  });
});

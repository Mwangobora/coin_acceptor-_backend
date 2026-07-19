import { APPLICATION_NAME } from '../../common/constants/application.constants';

import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns service health status', () => {
    const response = new HealthService().getHealth();

    expect(response.status).toBe('ok');
    expect(response.service).toBe(APPLICATION_NAME);
    expect(Number.isNaN(Date.parse(response.timestamp))).toBe(false);
  });
});

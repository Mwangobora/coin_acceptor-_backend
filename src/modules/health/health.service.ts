import { Injectable } from '@nestjs/common';

import { APPLICATION_NAME } from '../../common/constants/application.constants';

export type HealthResponse = {
  status: 'ok';
  service: typeof APPLICATION_NAME;
  timestamp: string;
};

@Injectable()
export class HealthService {
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: APPLICATION_NAME,
      timestamp: new Date().toISOString(),
    };
  }
}

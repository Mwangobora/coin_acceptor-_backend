import { Injectable } from '@nestjs/common';

export type HealthResponse = {
  status: 'ok';
  service: 'charging-system-api';
  timestamp: string;
};

@Injectable()
export class HealthService {
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'charging-system-api',
      timestamp: new Date().toISOString(),
    };
  }
}

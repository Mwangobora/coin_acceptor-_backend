import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { API_VERSION } from '../../common/constants/api.constants';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller({ path: 'health', version: API_VERSION })
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOkResponse({ description: 'Backend service health status.' })
  getHealth() {
    return this.healthService.getHealth();
  }
}

import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { API_VERSION } from '../../common/constants/api.constants';
import {
  IOT_API_CONTRACT_EXAMPLE,
  IOT_PAYMENT_CONTRACT_EXAMPLE,
} from './iot-payment-contract.example';

@ApiTags('iot-payment-contract')
@Controller({ path: 'iot/payment-contract', version: API_VERSION })
export class IotPaymentContractController {
  @Get()
  @ApiOperation({
    summary: 'Show payment-to-device payload contract for IoT integration',
    description:
      'Swagger-visible sample showing what the device receives after payment and what event the device sends back.',
  })
  @ApiOkResponse({
    description: 'Payment-to-device command and device event payload examples.',
    schema: { example: IOT_PAYMENT_CONTRACT_EXAMPLE },
  })
  getPaymentContract() {
    return IOT_PAYMENT_CONTRACT_EXAMPLE;
  }

  @Get('api')
  @ApiOperation({
    summary: 'Show full IoT API payload examples with payment first',
  })
  @ApiOkResponse({
    description: 'IoT command and event examples, payment event first.',
    schema: { example: IOT_API_CONTRACT_EXAMPLE },
  })
  getApiContract() {
    return IOT_API_CONTRACT_EXAMPLE;
  }
}

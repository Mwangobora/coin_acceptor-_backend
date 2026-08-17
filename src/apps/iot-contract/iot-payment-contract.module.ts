import { Module } from '@nestjs/common';

import { IotPaymentContractController } from './iot-payment-contract.controller';

@Module({
  controllers: [IotPaymentContractController],
})
export class IotPaymentContractModule {}

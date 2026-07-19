import { BadRequestException } from '@nestjs/common';

import { CommandPayloadSanitizerService } from './command-payload-sanitizer.service';
import { CommandPayloadValidatorRegistry } from './command-payload-validator-registry';

describe('CommandPayloadValidatorRegistry', () => {
  it('validates locker and port ownership', async () => {
    const prisma = {
      lockers: { findFirst: jest.fn().mockResolvedValue({ id: 'locker-1' }) },
      charging_ports: {
        findFirst: jest.fn().mockResolvedValue({ id: 'port-1' }),
      },
    };
    const registry = new CommandPayloadValidatorRegistry(
      prisma as never,
      new CommandPayloadSanitizerService(),
    );
    await expect(
      registry.validate({
        commandType: 'locker.lock',
        deviceId: 'device-1',
        payload: { lockerId: 'locker-1' },
      }),
    ).resolves.toBeUndefined();
    await expect(
      registry.validate({
        commandType: 'port.power_on',
        deviceId: 'device-1',
        payload: { portId: 'port-1' },
      }),
    ).resolves.toBeUndefined();
  });

  it('rejects unsafe payloads and missing hardware identity', async () => {
    const registry = new CommandPayloadValidatorRegistry(
      { lockers: { findFirst: jest.fn() } } as never,
      new CommandPayloadSanitizerService(),
    );
    await expect(
      registry.validate({
        commandType: 'device.restart',
        deviceId: 'device-1',
        payload: { secret: 'nope' },
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      registry.validate({
        commandType: 'locker.lock',
        deviceId: 'device-1',
        payload: {},
      }),
    ).rejects.toThrow(BadRequestException);
  });
});

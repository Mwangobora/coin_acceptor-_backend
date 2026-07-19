import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService({
    getOrThrow: () => 12,
  } as unknown as ConfigService);

  it('hashes and verifies with Argon2id', async () => {
    const hash = await service.hash('CorrectPassword123!');

    expect(hash).toContain('argon2id');
    await expect(service.verify(hash, 'CorrectPassword123!')).resolves.toBe(
      true,
    );
  });

  it('rejects weak or mismatched new passwords', () => {
    expect(() => service.validateNewPassword('short', 'short')).toThrow(
      BadRequestException,
    );
    expect(() =>
      service.validateNewPassword('CorrectPassword123!', 'Different123!'),
    ).toThrow(BadRequestException);
  });
});

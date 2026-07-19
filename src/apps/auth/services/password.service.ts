import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import bcrypt from 'bcrypt';

@Injectable()
export class PasswordService {
  constructor(private readonly config: ConfigService) {}

  async hash(value: string): Promise<string> {
    return String(await argon2.hash(value, { type: argon2.argon2id }));
  }

  async verify(hash: string, value: string): Promise<boolean> {
    if (hash.startsWith('$2')) return bcrypt.compare(value, hash);
    return Boolean(await argon2.verify(hash, value));
  }

  validateNewPassword(newPassword: string, confirmPassword: string): void {
    const minLength = this.config.getOrThrow<number>(
      'security.authMinPasswordLength',
    );
    if (newPassword.length < minLength) {
      throw new BadRequestException(
        `Password must be at least ${minLength} characters.`,
      );
    }
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Password confirmation does not match.');
    }
  }
}

import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class DeviceSecretHasher {
  hash(secret: string): Promise<string> {
    return argon2.hash(secret);
  }
}

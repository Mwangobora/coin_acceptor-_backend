import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import {
  assertNoForbiddenJsonKeys,
  sanitizeSensitiveJson,
} from '../../../common/utils/sensitive-json.util';

@Injectable()
export class CommandPayloadSanitizerService {
  assertSafe(value: unknown, depth = 0): void {
    try {
      assertNoForbiddenJsonKeys(value, depth);
    } catch {
      throw new BadRequestException(
        'Command payload contains forbidden fields.',
      );
    }
  }
}

export function sanitizeJson(
  value: Prisma.JsonValue | null,
): Prisma.JsonValue | null {
  return sanitizeSensitiveJson(value);
}

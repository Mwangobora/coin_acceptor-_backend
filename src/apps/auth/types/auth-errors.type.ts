import { UnauthorizedException } from '@nestjs/common';

export class RefreshTokenReuseError extends UnauthorizedException {
  constructor(
    readonly userId: string,
    readonly tokenFamilyId: string,
    readonly sessionId: string,
  ) {
    super('Refresh token reuse detected.');
  }
}

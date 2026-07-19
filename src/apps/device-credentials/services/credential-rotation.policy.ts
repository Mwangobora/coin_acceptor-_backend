import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import type { device_credentials, devices } from '@prisma/client';

@Injectable()
export class CredentialRotationPolicy {
  validateActive(credential: device_credentials): void {
    if (credential.status !== 'active' || credential.revoked_at) {
      throw new ConflictException('Credential is not active.');
    }
  }

  validateExpiry(expiresAt?: string, validFrom = new Date()): Date | undefined {
    if (!expiresAt) return undefined;
    const expires = new Date(expiresAt);
    if (expires <= validFrom) {
      throw new BadRequestException('expiresAt must be later than validFrom.');
    }
    return expires;
  }

  validateDeviceAllowsCreation(device: devices): void {
    if (['disabled', 'decommissioned'].includes(device.lifecycle_status)) {
      throw new BadRequestException('Device cannot receive credentials.');
    }
  }

  validateFinalActiveRevoke(input: {
    device: devices;
    activeCount: number;
    force?: boolean;
  }): void {
    if (input.device.lifecycle_status !== 'active' || input.activeCount > 1) {
      return;
    }
    if (!input.force) {
      throw new ConflictException('Cannot revoke final active credential.');
    }
  }
}

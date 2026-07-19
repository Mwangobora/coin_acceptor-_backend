import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class CredentialRecordService {
  constructor(private readonly prisma: PrismaService) {}

  async requireDevice(id: string) {
    const device = await this.prisma.devices.findUnique({ where: { id } });
    if (!device) throw new NotFoundException('Device not found.');
    return device;
  }

  async requireCredential(deviceId: string, credentialId: string) {
    const credential = await this.prisma.device_credentials.findFirst({
      where: { id: credentialId, device_id: deviceId },
      include: { devices: true },
    });
    if (!credential) throw new NotFoundException('Credential not found.');
    return credential;
  }

  activeCredentialCount(deviceId: string) {
    return this.prisma.device_credentials.count({
      where: { device_id: deviceId, status: 'active', revoked_at: null },
    });
  }
}

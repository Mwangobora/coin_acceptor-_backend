import { BadRequestException, Injectable } from '@nestjs/common';

import { PermissionService } from '../../access-control/services/permission.service';
import { StationScopeService } from '../../access-control/services/station-scope.service';
import type { RequestMetadata } from '../../auth/types/auth-request.type';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { CreateCredentialDto } from '../dto/create-credential.dto';
import type { CredentialQueryDto } from '../dto/credential-query.dto';
import type { RevokeCredentialDto } from '../dto/revoke-credential.dto';
import type { RotateCredentialDto } from '../dto/rotate-credential.dto';
import { mapCredential } from '../mappers/credential.mapper';
import { CredentialCreateOperation } from './credential-create.operation';
import { CredentialReadOperation } from './credential-read.operation';
import { CredentialRecordService } from './credential-record.service';
import { CredentialRevokeOperation } from './credential-revoke.operation';
import { CredentialRotateOperation } from './credential-rotate.operation';
import { CredentialRotationPolicy } from './credential-rotation.policy';

@Injectable()
export class DeviceCredentialService {
  constructor(
    private readonly scope: StationScopeService,
    private readonly permissions: PermissionService,
    private readonly records: CredentialRecordService,
    private readonly reader: CredentialReadOperation,
    private readonly creator: CredentialCreateOperation,
    private readonly rotator: CredentialRotateOperation,
    private readonly revoker: CredentialRevokeOperation,
    private readonly policy: CredentialRotationPolicy,
  ) {}

  async list(query: CredentialQueryDto, actor: AuthenticatedUser) {
    return this.reader.list(query, actor);
  }

  listForDevice(
    deviceId: string,
    query: CredentialQueryDto,
    actor: AuthenticatedUser,
  ) {
    return this.reader.listForDevice(deviceId, query, actor);
  }

  async get(deviceId: string, credentialId: string, actor: AuthenticatedUser) {
    return this.reader.get(deviceId, credentialId, actor);
  }

  async create(
    deviceId: string,
    dto: CreateCredentialDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    const device = await this.records.requireDevice(deviceId);
    await this.scope.requireStation(
      actor.id,
      'device_credentials.create',
      device.station_id,
    );
    this.policy.validateDeviceAllowsCreation(device);
    return this.creator.execute(deviceId, dto, actor, meta);
  }

  async rotate(
    deviceId: string,
    credentialId: string,
    dto: RotateCredentialDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    const before = await this.records.requireCredential(deviceId, credentialId);
    await this.scope.requireStation(
      actor.id,
      'device_credentials.rotate',
      before.devices.station_id,
    );
    this.policy.validateActive(before);
    return this.rotator.execute(before, dto, actor, meta);
  }

  async revoke(
    deviceId: string,
    credentialId: string,
    dto: RevokeCredentialDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    if (!dto.reason.trim())
      throw new BadRequestException('Reason is required.');
    const before = await this.records.requireCredential(deviceId, credentialId);
    await this.scope.requireStation(
      actor.id,
      'device_credentials.revoke',
      before.devices.station_id,
    );
    if (before.status === 'revoked' || before.revoked_at)
      return mapCredential(before);
    this.policy.validateFinalActiveRevoke({
      device: before.devices,
      activeCount: await this.records.activeCredentialCount(deviceId),
      force: dto.force,
    });
    if (
      dto.force &&
      !(await this.permissions.hasPermission(
        actor.id,
        'device_credentials.force_revoke',
        before.devices.station_id,
      ))
    ) {
      await this.scope.requireStation(
        actor.id,
        'device_credentials.force_revoke',
        before.devices.station_id,
      );
    }
    return this.revoker.execute(before, dto, actor, meta);
  }
}

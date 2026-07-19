import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, type device_events } from '@prisma/client';

import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PrismaService } from '../../../database/prisma.service';
import type { CreateDeviceEventDto } from '../dto/create-device-event.dto';
import { mapIngestResponse } from '../mappers/device-event.mapper';
import type { AuthenticatedDevice } from '../types/authenticated-device.type';
import { DeviceEventProcessor } from './device-event-processor';
import { DeviceEventValidatorService } from './device-event-validator.service';
import { PayloadHashService } from './payload-hash.service';

@Injectable()
export class DeviceEventService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogsService,
    private readonly validator: DeviceEventValidatorService,
    private readonly hashes: PayloadHashService,
    private readonly processor: DeviceEventProcessor,
  ) {}

  async ingest(input: {
    auth: AuthenticatedDevice;
    dto: CreateDeviceEventDto;
    requestId?: string;
    sourceIp?: string;
  }) {
    const occurredAt = this.validator.validate(input.dto);
    const payloadSha256 = this.hashes.hash(input.dto.payload);
    const receivedAt = new Date();
    const existing = await this.findDuplicate(input);
    if (existing) return this.handleDuplicate(existing, input, payloadSha256);
    const event = await this.createEvent(
      input,
      occurredAt,
      receivedAt,
      payloadSha256,
    ).catch(async (error: unknown) => {
      if (!isUniqueError(error)) throw error;
      const duplicate = await this.findDuplicate(input);
      if (!duplicate) throw error;
      return this.handleDuplicate(duplicate, input, payloadSha256);
    });
    if ('duplicate' in event) return event;
    return this.process(event);
  }

  private async createEvent(
    input: {
      auth: AuthenticatedDevice;
      dto: CreateDeviceEventDto;
      requestId?: string;
      sourceIp?: string;
    },
    occurredAt: Date,
    receivedAt: Date,
    payloadSha256: string,
  ) {
    return this.prisma.device_events.create({
      data: {
        station_id: input.auth.stationId,
        device_id: input.auth.deviceId,
        external_event_id: input.dto.externalEventId,
        event_category: input.dto.eventCategory,
        event_type: input.dto.eventType,
        sequence_number:
          input.dto.sequenceNumber === undefined
            ? undefined
            : BigInt(input.dto.sequenceNumber),
        occurred_at: occurredAt,
        received_at: receivedAt,
        firmware_version: input.dto.firmwareVersion,
        payload: input.dto.payload as Prisma.InputJsonObject,
        payload_sha256: payloadSha256,
        request_id: input.requestId,
        source_ip: input.sourceIp,
      },
    });
  }

  private async process(event: device_events) {
    try {
      const status = await this.processor.process(event);
      if (status === 'received') return mapIngestResponse(event, false);
      const updated = await this.prisma.device_events.update({
        where: { id: event.id },
        data: { processing_status: status, processed_at: new Date() },
      });
      return mapIngestResponse(updated, false);
    } catch {
      const failed = await this.prisma.device_events.update({
        where: { id: event.id },
        data: {
          processing_status: 'failed',
          failure_code: 'processing_failed',
          failure_reason: 'Device event could not be processed safely.',
        },
      });
      return mapIngestResponse(failed, false);
    }
  }

  private async findDuplicate(input: {
    auth: AuthenticatedDevice;
    dto: CreateDeviceEventDto;
  }) {
    return (
      (await this.prisma.device_events.findUnique({
        where: {
          device_id_external_event_id: {
            device_id: input.auth.deviceId,
            external_event_id: input.dto.externalEventId,
          },
        },
      })) ??
      (input.dto.sequenceNumber === undefined
        ? null
        : await this.prisma.device_events.findFirst({
            where: {
              device_id: input.auth.deviceId,
              sequence_number: BigInt(input.dto.sequenceNumber),
            },
          }))
    );
  }

  private async handleDuplicate(
    event: device_events,
    input: {
      auth: AuthenticatedDevice;
      dto: CreateDeviceEventDto;
      requestId?: string;
      sourceIp?: string;
    },
    payloadSha256: string,
  ) {
    if (this.matchesDuplicate(event, input.dto, payloadSha256)) {
      return mapIngestResponse(event, true);
    }
    await this.audit.record({
      action: 'device_events.conflicting_duplicate',
      entityType: 'device_events',
      entityId: event.id,
      stationId: input.auth.stationId,
      requestId: input.requestId,
      ipAddress: input.sourceIp,
      reason: 'Conflicting device event idempotency key reuse.',
      metadata: { credentialId: input.auth.credentialId },
    });
    throw new ConflictException(
      'Device event conflicts with an existing event.',
    );
  }

  private matchesDuplicate(
    event: device_events,
    dto: CreateDeviceEventDto,
    payloadSha256: string,
  ) {
    return (
      event.external_event_id === dto.externalEventId &&
      event.event_category === dto.eventCategory &&
      event.event_type === dto.eventType &&
      event.sequence_number?.toString() ===
        (dto.sequenceNumber === undefined
          ? undefined
          : String(dto.sequenceNumber)) &&
      event.occurred_at.getTime() === new Date(dto.occurredAt).getTime() &&
      (event.firmware_version ?? undefined) === dto.firmwareVersion &&
      event.payload_sha256 === payloadSha256
    );
  }
}

function isUniqueError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

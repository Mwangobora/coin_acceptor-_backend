import type { Prisma } from '@prisma/client';

export type DeviceCommandResponse = {
  id: string;
  stationId: string;
  deviceId: string;
  commandType: string;
  payload: Prisma.JsonValue;
  status: string;
  idempotencyKey: string | null;
  requestedByUserId: string | null;
  requestedAt: Date;
  availableAt: Date;
  sentAt: Date | null;
  acknowledgedAt: Date | null;
  completedAt: Date | null;
  expiresAt: Date | null;
  failureCode: string | null;
  failureReason: string | null;
  deviceResponse: Prisma.JsonValue | null;
  acknowledgementEventId: string | null;
};

export type DeviceCommandPollItem = {
  id: string;
  commandType: string;
  payload: Prisma.JsonValue;
  requestedAt: Date;
  expiresAt: Date | null;
};

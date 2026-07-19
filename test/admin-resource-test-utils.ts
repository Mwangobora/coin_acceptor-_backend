import { PrismaClient } from '@prisma/client';

export function stationRecord(
  prisma: PrismaClient,
  code: string,
  status = 'active',
) {
  return prisma.stations.create({
    data: {
      code,
      name: code,
      station_type: 'brt_station',
      region: 'Dar',
      status,
    },
  });
}

export function deviceRecord(
  prisma: PrismaClient,
  stationId: string,
  code: string,
  lifecycleStatus = 'pending',
) {
  return prisma.devices.create({
    data: {
      station_id: stationId,
      device_code: code,
      serial_number: `${code}_SERIAL`,
      name: code,
      lifecycle_status: lifecycleStatus,
    },
  });
}

export function lockerRecord(
  prisma: PrismaClient,
  deviceId: string,
  lockerNumber = 1,
  availabilityStatus = 'available',
) {
  return prisma.lockers.create({
    data: {
      device_id: deviceId,
      locker_number: lockerNumber,
      availability_status: availabilityStatus,
    },
  });
}

export function portRecord(
  prisma: PrismaClient,
  input: {
    deviceId: string;
    lockerId: string;
    portNumber?: number;
    hardwareChannel?: string;
    status?: string;
    powerState?: string;
  },
) {
  return prisma.charging_ports.create({
    data: {
      device_id: input.deviceId,
      locker_id: input.lockerId,
      port_number: input.portNumber ?? 1,
      port_type: 'usb_a',
      hardware_channel: input.hardwareChannel,
      status: input.status ?? 'available',
      power_state: input.powerState ?? 'off',
    },
  });
}

export async function activeSession(
  prisma: PrismaClient,
  input: {
    stationId: string;
    deviceId: string;
    lockerId: string;
    portId: string;
  },
) {
  await prisma.charging_sessions.create({
    data: {
      session_reference: `SESSION_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      station_id: input.stationId,
      device_id: input.deviceId,
      locker_id: input.lockerId,
      charging_port_id: input.portId,
      status: 'active',
      access_code_hash: 'hashed-code',
      purchased_duration_seconds: 3600,
      remaining_seconds: 3600,
      total_paid_minor: 1000,
      started_at: new Date(),
      expected_end_at: new Date(Date.now() + 3600_000),
    },
  });
}

export type LockerResponse = {
  id: string;
  deviceId: string;
  lockerNumber: number;
  label: string | null;
  availabilityStatus: string;
  doorStatus: string;
  lockStatus: string;
  sensorStatus: string;
  lastStatusChangedAt: string | null;
  lastSeenAt: string | null;
  maintenanceReason: string | null;
  createdAt: string;
  updatedAt: string;
  device?: { id: string; stationId: string; deviceCode: string; name: string };
  totalPorts?: number;
  availablePorts?: number;
  hasActiveSession?: boolean;
};

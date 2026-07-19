import type { Request } from 'express';

export type AuthenticatedDevice = {
  deviceId: string;
  stationId: string;
  credentialId: string;
  keyId: string;
  credentialType: 'api_key' | 'hmac';
};

export type DeviceAuthRequest = Request & {
  rawBody?: Buffer;
  requestId?: string;
  deviceAuth?: AuthenticatedDevice;
};

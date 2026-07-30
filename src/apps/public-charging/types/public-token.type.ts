export type CheckoutTokenRecord = {
  stationId: string;
  deviceId: string;
  checkoutHash: string;
  expiresAt: string;
};

export type CustomerFlowRecord = {
  flowHash: string;
  checkoutHash: string;
  stationId: string;
  deviceId: string;
  paymentId: string;
  paymentReference: string;
  sessionReference?: string;
  expiresAt: string;
  revokedAt?: string;
};

export type PublicQrDevice = {
  id: string;
  station_id: string;
  device_code: string;
  name: string;
  lifecycle_status: string;
  connectivity_status: string;
  operational_status: string;
  stations: {
    name: string;
    region: string;
    district: string | null;
    status: string;
  };
};

export type PublicPackage = {
  publicPackageId: string;
  name: string;
  description: string | null;
  priceMinor: string;
  currency: string;
  durationSeconds: number;
  displayOrder: number;
};

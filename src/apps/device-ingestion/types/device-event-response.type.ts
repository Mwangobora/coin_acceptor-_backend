export type DeviceEventIngestResponse = {
  eventId: string;
  processingStatus: string;
  duplicate: boolean;
  receivedAt: Date;
};

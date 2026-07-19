export type ApiError = {
  statusCode: number;
  code: string;
  message: string;
  errors: string[];
  path: string;
  requestId: string;
  timestamp: string;
};

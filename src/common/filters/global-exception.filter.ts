import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { REQUEST_ID_HEADER } from '../constants/application.constants';
import type { ApiError } from '../types/api-error.type';

type RequestWithId = Request & { requestId?: string };

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<RequestWithId>();
    const response = http.getResponse<Response>();
    const statusCode = this.getStatusCode(exception);

    if (statusCode >= Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      this.logger.error('Unhandled server error', exception);
    }

    response.status(statusCode).json(
      this.buildError({
        exception,
        path: request.originalUrl,
        requestId: request.requestId ?? request.header(REQUEST_ID_HEADER) ?? '',
        statusCode,
      }),
    );
  }

  private buildError(input: {
    exception: unknown;
    path: string;
    requestId: string;
    statusCode: number;
  }): ApiError {
    const errors = this.getErrors(input.exception);
    const isValidationError = errors.length > 0;

    return {
      statusCode: input.statusCode,
      code: isValidationError ? 'VALIDATION_ERROR' : this.getCode(input),
      message: isValidationError
        ? 'Request validation failed'
        : this.getMessage(input.exception),
      errors,
      path: input.path,
      requestId: input.requestId,
      timestamp: new Date().toISOString(),
    };
  }

  private getStatusCode(exception: unknown): number {
    return exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getCode(input: { exception: unknown; statusCode: number }): string {
    return input.exception instanceof HttpException
      ? HttpStatus[input.statusCode]
      : 'INTERNAL_SERVER_ERROR';
  }

  private getMessage(exception: unknown): string {
    if (!(exception instanceof HttpException)) return 'Internal server error';
    const response = exception.getResponse();
    if (typeof response === 'string') return response;
    if (typeof response === 'object' && response && 'message' in response) {
      const message = response.message;
      return Array.isArray(message)
        ? 'Request validation failed'
        : String(message);
    }
    return exception.message;
  }

  private getErrors(exception: unknown): string[] {
    if (!(exception instanceof HttpException)) return [];
    const response = exception.getResponse();
    if (typeof response !== 'object' || !response || !('message' in response)) {
      return [];
    }
    return Array.isArray(response.message)
      ? response.message.map((message) => String(message))
      : [];
  }
}

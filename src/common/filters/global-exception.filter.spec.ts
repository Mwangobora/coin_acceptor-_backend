import { ArgumentsHost, BadRequestException } from '@nestjs/common';

import { GlobalExceptionFilter } from './global-exception.filter';

function createHost() {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const request = {
    originalUrl: '/api/v1/example',
    requestId: 'request-1',
    header: jest.fn(),
  };

  return {
    host: {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as ArgumentsHost,
    response,
  };
}

describe('GlobalExceptionFilter', () => {
  it('formats validation errors consistently', () => {
    const { host, response } = createHost();
    const exception = new BadRequestException({
      message: ['name must be a string'],
    });

    new GlobalExceptionFilter().catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        errors: ['name must be a string'],
        requestId: 'request-1',
      }),
    );
  });
});

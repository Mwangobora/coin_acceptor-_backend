import { createHash, createHmac } from 'node:crypto';

import { DeviceHmacService } from './device-hmac.service';

describe('DeviceHmacService', () => {
  it('authenticates valid HMAC signatures', async () => {
    const secret = 'secret';
    const body = Buffer.from('{"ok":true}');
    const timestamp = new Date().toISOString();
    const nonce = 'nonce-1';
    const canonical = [
      'POST',
      '/api/v1/device-ingestion/events',
      timestamp,
      nonce,
      createHash('sha256').update(body).digest('hex'),
    ].join('\n');
    const request = requestFor(
      timestamp,
      nonce,
      body,
      createHmac('sha256', secret).update(canonical).digest('hex'),
    );

    await expect(
      service(secret).authenticate(request as never),
    ).resolves.toMatchObject({
      credentialType: 'hmac',
      deviceId: 'device-1',
    });
  });
});

function service(secret: string) {
  return new DeviceHmacService(
    {
      device_credentials: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'credential-1',
          device_id: 'device-1',
          key_id: 'key-1',
          secret_encrypted: 'encrypted',
          devices: { station_id: 'station-1' },
        }),
        update: jest.fn(),
      },
    } as never,
    { decrypt: jest.fn().mockReturnValue(secret) } as never,
    { reserveNonce: jest.fn().mockResolvedValue(true) } as never,
    { getOrThrow: jest.fn().mockReturnValue(300) } as never,
  );
}

function requestFor(
  timestamp: string,
  nonce: string,
  body: Buffer,
  signature: string,
) {
  const headers: Record<string, string> = {
    'x-device-key-id': 'key-1',
    'x-device-timestamp': timestamp,
    'x-device-nonce': nonce,
    'x-device-signature': signature,
  };
  return {
    method: 'POST',
    originalUrl: '/api/v1/device-ingestion/events',
    rawBody: body,
    header: (name: string) => headers[name],
  };
}

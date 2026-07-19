import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import {
  createCipheriv,
  createHash,
  createHmac,
  randomBytes,
} from 'node:crypto';

const encryptionKey = '0123456789abcdef0123456789abcdef';

export function event(
  id: string,
  payload: Record<string, unknown> = {},
  sequenceNumber?: number,
) {
  return {
    externalEventId: id,
    eventCategory: 'heartbeat',
    eventType: 'device.heartbeat',
    sequenceNumber,
    occurredAt: new Date().toISOString(),
    payload,
  };
}

export function telemetry(id: string, payload: Record<string, unknown>) {
  return {
    ...event(id, payload),
    eventCategory: 'telemetry',
    eventType: 'device.telemetry',
  };
}

export function lockerEvent(id: string, lockerId: string) {
  return {
    ...event(id, { lockerId }),
    eventCategory: 'locker',
    eventType: 'locker.locked',
  };
}

export function portEvent(
  id: string,
  portId: string,
  extra: Record<string, unknown> = {},
) {
  return {
    ...event(id, { portId, ...extra }),
    eventCategory: 'power',
    eventType: 'port.power_on',
  };
}

export function auth(keyId: string, secret: string) {
  return `DeviceApiKey ${keyId}.${secret}`;
}

export async function apiCredential(
  prisma: PrismaClient,
  deviceId: string,
  secret: string,
  status = 'active',
  expired = false,
) {
  const credential = await prisma.device_credentials.create({
    data: {
      device_id: deviceId,
      key_id: `cred_api_${secret}_${Date.now()}`,
      credential_type: 'api_key',
      secret_hash: String(await argon2.hash(secret)),
      status,
      valid_from: expired
        ? new Date(Date.now() - 2000)
        : new Date(Date.now() - 1000),
      expires_at: expired ? new Date(Date.now() - 1000) : undefined,
    },
  });
  return credential.key_id;
}

export async function hmacCredential(
  prisma: PrismaClient,
  deviceId: string,
  secret: string,
) {
  const credential = await prisma.device_credentials.create({
    data: {
      device_id: deviceId,
      key_id: `cred_hmac_${Date.now()}`,
      credential_type: 'hmac',
      secret_encrypted: encrypt(secret),
    },
  });
  return credential.key_id;
}

export function hmacHeaders(
  keyId: string,
  secret: string,
  body: string,
  nonce: string,
  timestamp = new Date().toISOString(),
) {
  const canonical = [
    'POST',
    '/api/v1/device-ingestion/events',
    timestamp,
    nonce,
    createHash('sha256').update(body).digest('hex'),
  ].join('\n');
  return {
    'Content-Type': 'application/json',
    'X-Device-Key-Id': keyId,
    'X-Device-Timestamp': timestamp,
    'X-Device-Nonce': nonce,
    'X-Device-Signature': createHmac('sha256', secret)
      .update(canonical)
      .digest('hex'),
  };
}

function encrypt(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(encryptionKey), iv);
  const ciphertext = Buffer.concat([cipher.update(secret), cipher.final()]);
  return [
    'v1',
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    ciphertext.toString('base64url'),
  ].join(':');
}

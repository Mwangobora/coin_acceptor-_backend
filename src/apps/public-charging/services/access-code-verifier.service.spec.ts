import { createHmac } from 'node:crypto';

import { canonicalInput } from './access-code-verifier.service';

describe('AccessCodeVerifierService', () => {
  it('documents the ESP32 verifier canonical input', () => {
    const canonical = canonicalInput({
      sessionReference: 'SESSION-123',
      lockerNumber: 2,
      pin: '483921',
    });
    const verifier = createHmac('sha256', 'device-secret')
      .update(canonical)
      .digest('hex');

    expect(canonical).toBe('SESSION-123:2:483921');
    expect(`hmac-sha256:${verifier}`).toMatch(/^hmac-sha256:[a-f0-9]{64}$/);
  });
});

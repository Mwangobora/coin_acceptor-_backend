import { ConflictException } from '@nestjs/common';

import { PaymentStatusPolicy } from './payment-status.policy';

describe('PaymentStatusPolicy', () => {
  const policy = new PaymentStatusPolicy();

  it('allows valid transitions and rejects terminal changes', () => {
    expect(() =>
      policy.assertTransition('pending', 'processing'),
    ).not.toThrow();
    expect(() =>
      policy.assertTransition('processing', 'confirmed'),
    ).not.toThrow();
    expect(() =>
      policy.assertTransition('confirmed', 'refunded'),
    ).not.toThrow();
    expect(() => policy.assertTransition('failed', 'confirmed')).toThrow(
      ConflictException,
    );
    expect(() => policy.assertTransition('confirmed', 'failed')).toThrow(
      ConflictException,
    );
    expect(() => policy.assertTransition('unknown', 'confirmed')).toThrow(
      ConflictException,
    );
  });

  it('validates confirmed money rules and terminal status checks', () => {
    expect(() => policy.assertConfirm(500n, 500n, new Date())).not.toThrow();
    expect(() => policy.assertConfirm(499n, 500n, new Date())).toThrow(
      ConflictException,
    );
    expect(policy.isTerminal('confirmed')).toBe(true);
    expect(policy.isTerminal('pending')).toBe(false);
  });
});

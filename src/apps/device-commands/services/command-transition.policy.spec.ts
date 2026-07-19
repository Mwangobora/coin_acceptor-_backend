import { ConflictException } from '@nestjs/common';

import { CommandTransitionPolicy } from './command-transition.policy';

describe('CommandTransitionPolicy', () => {
  const policy = new CommandTransitionPolicy();

  it('allows queued cancellation and sent acknowledgements', () => {
    expect(() => policy.assertCanCancel('queued')).not.toThrow();
    expect(() =>
      policy.assertCanAcknowledge('sent', 'completed'),
    ).not.toThrow();
  });

  it('rejects terminal and impossible transitions', () => {
    expect(() => policy.assertCanCancel('completed')).toThrow(
      ConflictException,
    );
    expect(() => policy.assertCanAcknowledge('queued', 'acknowledged')).toThrow(
      ConflictException,
    );
    expect(() => policy.assertCanAcknowledge('completed', 'failed')).toThrow(
      ConflictException,
    );
  });
});

import { DeviceEventProcessor } from './device-event-processor';

describe('DeviceEventProcessor', () => {
  it('dispatches to matching handlers and preserves unsupported events', async () => {
    const matching = {
      canHandle: jest.fn().mockReturnValue(true),
      handle: jest.fn().mockResolvedValue(undefined),
    };
    const processor = new DeviceEventProcessor(
      matching as never,
      { canHandle: jest.fn() } as never,
      { canHandle: jest.fn() } as never,
      { canHandle: jest.fn() } as never,
      { canHandle: jest.fn() } as never,
      { canHandle: jest.fn() } as never,
    );

    await expect(processor.process(event('heartbeat'))).resolves.toBe(
      'processed',
    );
    expect(matching.handle).toHaveBeenCalled();

    matching.canHandle.mockReturnValue(false);
    await expect(processor.process(event('system'))).resolves.toBe('received');
  });
});

function event(category: string) {
  return {
    event_category: category,
    event_type: 'device.test',
    payload: {},
    received_at: new Date(),
  } as never;
}

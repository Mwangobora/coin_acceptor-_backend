import { AccessCodeGenerationService } from './access-code-generation.service';

describe('AccessCodeGenerationService', () => {
  it('generates four numeric digits without trivial repeated values', () => {
    const service = new AccessCodeGenerationService();

    for (let index = 0; index < 20; index += 1) {
      const pin = service.generate();

      expect(pin).toMatch(/^\d{4}$/);
      expect(pin).not.toMatch(/^(\d)\1{3}$/);
    }
  });
});

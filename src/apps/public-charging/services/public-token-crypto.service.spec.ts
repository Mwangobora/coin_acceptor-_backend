import { PublicTokenCryptoService } from './public-token-crypto.service';

describe('PublicTokenCryptoService', () => {
  it('generates opaque tokens and hashes normalized values', () => {
    const service = new PublicTokenCryptoService();
    const token = service.generate();

    expect(token).toHaveLength(43);
    expect(service.hash(` ${token} `)).toBe(service.hash(token));
    expect(service.safeEqual(service.hash(token), service.hash(token))).toBe(
      true,
    );
  });
});

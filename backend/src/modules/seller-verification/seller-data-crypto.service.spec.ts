import { SellerDataCryptoService } from './seller-data-crypto.service';

const TEST_KEY = Buffer.alloc(32, 7).toString('base64');

describe('SellerDataCryptoService', () => {
  const originalKey = process.env.SELLER_DATA_ENCRYPTION_KEY;
  const service = new SellerDataCryptoService();

  beforeEach(() => {
    delete process.env.SELLER_DATA_ENCRYPTION_KEYS;
    delete process.env.SELLER_DATA_ACTIVE_KEY_ID;
    process.env.SELLER_DATA_ENCRYPTION_KEY = TEST_KEY;
  });

  afterAll(() => {
    if (originalKey === undefined) {
      delete process.env.SELLER_DATA_ENCRYPTION_KEY;
    } else {
      process.env.SELLER_DATA_ENCRYPTION_KEY = originalKey;
    }
  });

  it('encrypts and decrypts without storing plaintext', () => {
    const encrypted = service.encrypt('012345678901');

    expect(encrypted).not.toContain('012345678901');
    expect(service.decrypt(encrypted)).toBe('012345678901');
  });

  it('uses a fresh nonce for every encryption', () => {
    expect(service.encrypt('same-value')).not.toBe(
      service.encrypt('same-value'),
    );
  });

  it('decrypts existing ciphertext after rotating the active key', () => {
    const oldKey = Buffer.alloc(32, 3).toString('base64');
    const newKey = Buffer.alloc(32, 4).toString('base64');
    process.env.SELLER_DATA_ENCRYPTION_KEYS = `old:${oldKey},new:${newKey}`;
    process.env.SELLER_DATA_ACTIVE_KEY_ID = 'old';
    const encrypted = service.encrypt('rotation-safe');

    process.env.SELLER_DATA_ACTIVE_KEY_ID = 'new';
    expect(service.decrypt(encrypted)).toBe('rotation-safe');
    expect(service.encrypt('rotation-safe').split('.')[1]).toBe('new');
  });

  it('creates the same normalized hash for equivalent values', () => {
    expect(service.hash(' ab 123 ')).toBe(service.hash('AB123'));
  });

  it('rejects tampered ciphertext', () => {
    const encrypted = service.encrypt('sensitive-value');
    const tampered = `${encrypted.slice(0, -1)}${encrypted.endsWith('A') ? 'B' : 'A'}`;

    expect(() => service.decrypt(tampered)).toThrow();
  });

  it('returns only masked last-four display data', () => {
    expect(service.mask(service.last4('0123456789'))).toBe('•••• 6789');
    expect(service.mask(null)).toBeNull();
  });
});

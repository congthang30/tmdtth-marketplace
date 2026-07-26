import {
  getSellerDataActiveKey,
  getSellerDataEncryptionKeys,
  getSellerDocumentFolder,
  getSellerDocumentMaxFileSizeBytes,
  getSellerDocumentSignedUrlTtlSeconds,
  validateSellerVerificationConfig,
} from './seller-verification.config';

describe('seller verification config', () => {
  const originalEnv = { ...process.env };
  const keyA = Buffer.alloc(32, 9).toString('base64');
  const keyB = Buffer.alloc(32, 8).toString('base64');

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.SELLER_DATA_ENCRYPTION_KEY;
    delete process.env.SELLER_DATA_ENCRYPTION_KEYS;
    delete process.env.SELLER_DATA_ACTIVE_KEY_ID;
    delete process.env.SELLER_DOCUMENT_CLOUDINARY_FOLDER;
    delete process.env.SELLER_DOCUMENT_MAX_FILE_SIZE_BYTES;
    delete process.env.SELLER_DOCUMENT_SIGNED_URL_TTL_SECONDS;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('accepts the backward-compatible single 32-byte key', () => {
    process.env.SELLER_DATA_ENCRYPTION_KEY = keyA;
    expect(getSellerDataActiveKey()).toEqual({
      id: 'primary',
      key: Buffer.alloc(32, 9),
    });
  });

  it('parses a keyring and selects the configured active key', () => {
    process.env.SELLER_DATA_ENCRYPTION_KEYS = `old:${keyA},current:${keyB}`;
    process.env.SELLER_DATA_ACTIVE_KEY_ID = 'current';

    expect(getSellerDataEncryptionKeys().size).toBe(2);
    expect(getSellerDataActiveKey()).toEqual({
      id: 'current',
      key: Buffer.alloc(32, 8),
    });
  });

  it.each([undefined, '', 'not-base64', Buffer.alloc(16).toString('base64')])(
    'rejects a missing or invalid legacy encryption key: %s',
    (value) => {
      if (value !== undefined) {
        process.env.SELLER_DATA_ENCRYPTION_KEY = value;
      }
      expect(() => getSellerDataActiveKey()).toThrow();
    },
  );

  it.each([
    `duplicate:${keyA},duplicate:${keyB}`,
    `bad id:${keyA}`,
    `missing-value:`,
  ])('rejects malformed keyring %s', (keyring) => {
    process.env.SELLER_DATA_ENCRYPTION_KEYS = keyring;
    process.env.SELLER_DATA_ACTIVE_KEY_ID = 'duplicate';
    expect(() => getSellerDataEncryptionKeys()).toThrow();
  });

  it('rejects an active key ID that is not in the keyring', () => {
    process.env.SELLER_DATA_ENCRYPTION_KEYS = `old:${keyA}`;
    process.env.SELLER_DATA_ACTIVE_KEY_ID = 'missing';
    expect(() => getSellerDataActiveKey()).toThrow();
  });

  it('validates the complete startup environment', () => {
    process.env.SELLER_DATA_ENCRYPTION_KEY = keyA;
    expect(() => validateSellerVerificationConfig()).not.toThrow();
  });

  it('uses safe document defaults', () => {
    expect(getSellerDocumentFolder()).toBe('tmdtth/seller-documents');
    expect(getSellerDocumentMaxFileSizeBytes()).toBe(10 * 1024 * 1024);
    expect(getSellerDocumentSignedUrlTtlSeconds()).toBe(300);
  });

  it.each(['../private', 'seller documents', 'folder:*'])(
    'rejects unsafe document folder %s',
    (folder) => {
      process.env.SELLER_DOCUMENT_CLOUDINARY_FOLDER = folder;
      expect(() => getSellerDocumentFolder()).toThrow();
    },
  );

  it.each(['0', '-1', '1.5', 'not-a-number'])(
    'rejects invalid positive integer configuration %s',
    (value) => {
      process.env.SELLER_DOCUMENT_MAX_FILE_SIZE_BYTES = value;
      expect(() => getSellerDocumentMaxFileSizeBytes()).toThrow();
    },
  );
});

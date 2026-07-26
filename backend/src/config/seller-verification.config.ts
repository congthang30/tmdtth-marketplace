const DEFAULT_DOCUMENT_FOLDER = 'tmdtth/seller-documents';
const DEFAULT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const DEFAULT_SIGNED_URL_TTL_SECONDS = 300;
const SAFE_FOLDER_PATTERN = /^[a-zA-Z0-9/_-]+$/;

function parsePositiveInteger(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return value;
}

const KEY_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

function parseEncryptionKey(raw: string, name: string): Buffer {
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32 || key.toString('base64') !== raw) {
    throw new Error(`${name} must be a canonical base64-encoded 32-byte key.`);
  }
  return key;
}

export function getSellerDataEncryptionKeys(): ReadonlyMap<string, Buffer> {
  const keyring = process.env.SELLER_DATA_ENCRYPTION_KEYS?.trim();
  if (!keyring) {
    const legacy = process.env.SELLER_DATA_ENCRYPTION_KEY?.trim();
    if (!legacy) {
      throw new Error(
        'SELLER_DATA_ENCRYPTION_KEYS or SELLER_DATA_ENCRYPTION_KEY is required.',
      );
    }
    return new Map([
      ['primary', parseEncryptionKey(legacy, 'SELLER_DATA_ENCRYPTION_KEY')],
    ]);
  }

  const keys = new Map<string, Buffer>();
  for (const entry of keyring.split(',')) {
    const separator = entry.indexOf(':');
    const id = entry.slice(0, separator).trim();
    const raw = entry.slice(separator + 1).trim();
    if (separator <= 0 || !KEY_ID_PATTERN.test(id) || !raw || keys.has(id)) {
      throw new Error(
        'SELLER_DATA_ENCRYPTION_KEYS has an invalid or duplicate key ID.',
      );
    }
    keys.set(id, parseEncryptionKey(raw, `SELLER_DATA_ENCRYPTION_KEYS.${id}`));
  }
  return keys;
}

export function getSellerDataActiveKey(): { id: string; key: Buffer } {
  const keys = getSellerDataEncryptionKeys();
  const configuredId = process.env.SELLER_DATA_ACTIVE_KEY_ID?.trim();
  const id = configuredId || (keys.size === 1 ? [...keys.keys()][0] : '');
  if (!id || !keys.has(id)) {
    throw new Error(
      'SELLER_DATA_ACTIVE_KEY_ID must identify a configured key.',
    );
  }
  return { id, key: keys.get(id) as Buffer };
}

export function validateSellerVerificationConfig(): void {
  getSellerDataActiveKey();
  getSellerDocumentFolder();
  getSellerDocumentMaxFileSizeBytes();
  getSellerDocumentSignedUrlTtlSeconds();
}

export function getSellerDocumentFolder(): string {
  const folder =
    process.env.SELLER_DOCUMENT_CLOUDINARY_FOLDER?.trim() ||
    DEFAULT_DOCUMENT_FOLDER;

  if (!SAFE_FOLDER_PATTERN.test(folder) || folder.includes('..')) {
    throw new Error(
      'SELLER_DOCUMENT_CLOUDINARY_FOLDER contains unsupported characters.',
    );
  }

  return folder;
}

export function getSellerDocumentMaxFileSizeBytes(): number {
  return parsePositiveInteger(
    'SELLER_DOCUMENT_MAX_FILE_SIZE_BYTES',
    DEFAULT_MAX_FILE_SIZE_BYTES,
  );
}

export function getSellerDocumentSignedUrlTtlSeconds(): number {
  return parsePositiveInteger(
    'SELLER_DOCUMENT_SIGNED_URL_TTL_SECONDS',
    DEFAULT_SIGNED_URL_TTL_SECONDS,
  );
}

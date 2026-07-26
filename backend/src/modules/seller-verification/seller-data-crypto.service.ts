import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from 'crypto';
import { Injectable } from '@nestjs/common';
import {
  getSellerDataActiveKey,
  getSellerDataEncryptionKeys,
} from '../../config/seller-verification.config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const PAYLOAD_VERSION = 'v1';

@Injectable()
export class SellerDataCryptoService {
  encrypt(value: string): string {
    const normalized = value.trim();
    const { id: keyId, key } = getSellerDataActiveKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    const ciphertext = Buffer.concat([
      cipher.update(normalized, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [
      PAYLOAD_VERSION,
      keyId,
      iv.toString('base64url'),
      authTag.toString('base64url'),
      ciphertext.toString('base64url'),
    ].join('.');
  }

  decrypt(payload: string): string {
    const [version, keyId, ivValue, authTagValue, ciphertextValue, extra] =
      payload.split('.');

    if (
      version !== PAYLOAD_VERSION ||
      !keyId ||
      !ivValue ||
      !authTagValue ||
      !ciphertextValue ||
      extra
    ) {
      throw new Error('Encrypted seller data has an invalid format.');
    }

    const key = getSellerDataEncryptionKeys().get(keyId);
    if (!key) {
      throw new Error(`Seller data encryption key ${keyId} is unavailable.`);
    }

    const decipher = createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(ivValue, 'base64url'),
      { authTagLength: AUTH_TAG_LENGTH },
    );
    decipher.setAuthTag(Buffer.from(authTagValue, 'base64url'));

    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }

  hash(value: string): string {
    return createHmac('sha256', getSellerDataActiveKey().key)
      .update(this.normalizeForHash(value))
      .digest('hex');
  }

  last4(value: string): string {
    const normalized = value.replace(/\s+/g, '');
    return normalized.slice(-4);
  }

  mask(last4: string | null | undefined): string | null {
    return last4 ? `•••• ${last4}` : null;
  }

  checksum(value: Buffer): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private normalizeForHash(value: string): string {
    return value.trim().normalize('NFKC').replace(/\s+/g, '').toUpperCase();
  }
}

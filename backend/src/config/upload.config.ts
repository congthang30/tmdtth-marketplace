import { mkdirSync } from 'fs';
import { join } from 'path';

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const DEFAULT_UPLOAD_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export function getUploadRoot(): string {
  return process.env.UPLOAD_DIR
    ? process.env.UPLOAD_DIR
    : join(process.cwd(), 'uploads');
}

export function ensureUploadRoot(): string {
  const uploadRoot = getUploadRoot();
  mkdirSync(uploadRoot, { recursive: true });
  return uploadRoot;
}

export function getUploadPublicPrefix(): string {
  const prefix = process.env.UPLOAD_PUBLIC_PREFIX ?? '/uploads';
  return prefix.startsWith('/') ? prefix : `/${prefix}`;
}

export function getUploadMaxFileSizeBytes(): number {
  const rawValue = process.env.UPLOAD_MAX_FILE_SIZE_BYTES?.trim();

  if (!rawValue) {
    return DEFAULT_UPLOAD_MAX_FILE_SIZE_BYTES;
  }

  const value = Number(rawValue);

  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error('UPLOAD_MAX_FILE_SIZE_BYTES must be a positive integer.');
  }

  return value;
}

export function buildUploadUrl(fileName: string): string {
  return `${getUploadPublicPrefix()}/${fileName}`.replace(/\/{2,}/g, '/');
}

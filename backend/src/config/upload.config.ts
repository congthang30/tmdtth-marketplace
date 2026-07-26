export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const DEFAULT_UPLOAD_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const DEFAULT_CLOUDINARY_FOLDER = 'tmdtth/products';
const CLOUDINARY_FOLDER_PATTERN = /^[a-zA-Z0-9/_-]+$/;

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

export function getCloudinaryFolder(): string {
  const folder =
    process.env.CLOUDINARY_FOLDER?.trim() || DEFAULT_CLOUDINARY_FOLDER;

  if (!CLOUDINARY_FOLDER_PATTERN.test(folder) || folder.includes('..')) {
    throw new Error(
      'CLOUDINARY_FOLDER may only contain letters, numbers, slash, underscore, or hyphen.',
    );
  }

  return folder.replace(/^\/+|\/+$/g, '');
}

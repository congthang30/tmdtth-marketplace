import {
  getCloudinaryFolder,
  getUploadMaxFileSizeBytes,
} from './upload.config';

describe('upload config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.UPLOAD_MAX_FILE_SIZE_BYTES;
    delete process.env.CLOUDINARY_FOLDER;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses the default max file size when unset', () => {
    expect(getUploadMaxFileSizeBytes()).toBe(5 * 1024 * 1024);
  });

  it('uses a configured positive integer max file size', () => {
    process.env.UPLOAD_MAX_FILE_SIZE_BYTES = '1024';

    expect(getUploadMaxFileSizeBytes()).toBe(1024);
  });

  it.each(['0', '-1', '1.5', 'not-a-number'])(
    'rejects invalid max file size %s',
    (value) => {
      process.env.UPLOAD_MAX_FILE_SIZE_BYTES = value;

      expect(() => getUploadMaxFileSizeBytes()).toThrow(
        'UPLOAD_MAX_FILE_SIZE_BYTES must be a positive integer.',
      );
    },
  );

  it('uses the default Cloudinary folder when unset', () => {
    expect(getCloudinaryFolder()).toBe('tmdtth/products');
  });

  it('accepts a safe Cloudinary folder', () => {
    process.env.CLOUDINARY_FOLDER = 'marketplace/product_images';

    expect(getCloudinaryFolder()).toBe('marketplace/product_images');
  });

  it.each(['../private', 'folder with spaces', 'folder:*'])(
    'rejects unsafe Cloudinary folder %s',
    (value) => {
      process.env.CLOUDINARY_FOLDER = value;

      expect(() => getCloudinaryFolder()).toThrow(
        'CLOUDINARY_FOLDER may only contain letters, numbers, slash, underscore, or hyphen.',
      );
    },
  );
});

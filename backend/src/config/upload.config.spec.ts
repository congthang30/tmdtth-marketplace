import { getUploadMaxFileSizeBytes } from './upload.config';

describe('upload config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.UPLOAD_MAX_FILE_SIZE_BYTES;
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
});

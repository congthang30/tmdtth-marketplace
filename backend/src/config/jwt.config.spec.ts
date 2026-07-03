import { getJwtSecret } from './jwt.config';

describe('jwt config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.JWT_SECRET;
    delete process.env.NODE_ENV;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses the development fallback outside production', () => {
    expect(getJwtSecret()).toBe('change-me-in-env');
  });

  it('requires an explicit secret in production', () => {
    process.env.NODE_ENV = 'production';

    expect(() => getJwtSecret()).toThrow(
      'JWT_SECRET is required when NODE_ENV=production.',
    );
  });

  it('returns the configured secret', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'configured-secret';

    expect(getJwtSecret()).toBe('configured-secret');
  });
});

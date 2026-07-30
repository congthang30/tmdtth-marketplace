import {
  getSepayWebhookSecret,
  isSepayWebhookEnabled,
  validateFinanceConfig,
} from './finance.config';

describe('finance config', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.SEPAY_WEBHOOK_ENABLED;
    delete process.env.SEPAY_WEBHOOK_SECRET;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('keeps the SePay webhook disabled by default', () => {
    expect(isSepayWebhookEnabled()).toBe(false);
    expect(() => validateFinanceConfig()).not.toThrow();
  });

  it.each(['yes', '1', 'enabled'])(
    'rejects an invalid enable flag: %s',
    (value) => {
      process.env.SEPAY_WEBHOOK_ENABLED = value;
      expect(() => validateFinanceConfig()).toThrow(
        'SEPAY_WEBHOOK_ENABLED must be true or false',
      );
    },
  );

  it('requires a strong secret when enabled', () => {
    process.env.SEPAY_WEBHOOK_ENABLED = 'true';
    process.env.SEPAY_WEBHOOK_SECRET = 'too-short';
    expect(() => validateFinanceConfig()).toThrow(
      'SEPAY_WEBHOOK_SECRET must contain at least 32 characters',
    );
  });

  it('returns the configured secret when enabled', () => {
    const secret = '0123456789abcdef0123456789abcdef';
    process.env.SEPAY_WEBHOOK_ENABLED = 'true';
    process.env.SEPAY_WEBHOOK_SECRET = secret;
    expect(getSepayWebhookSecret()).toBe(secret);
    expect(() => validateFinanceConfig()).not.toThrow();
  });
});

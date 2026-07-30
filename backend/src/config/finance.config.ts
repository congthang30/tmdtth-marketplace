const MINIMUM_WEBHOOK_SECRET_LENGTH = 32;

export function isSepayWebhookEnabled(): boolean {
  const raw = process.env.SEPAY_WEBHOOK_ENABLED?.trim().toLowerCase();
  if (!raw) return false;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new Error('SEPAY_WEBHOOK_ENABLED must be true or false.');
}

export function getSepayWebhookSecret(): string {
  if (!isSepayWebhookEnabled()) {
    throw new Error('SEPAY webhook is disabled.');
  }
  const secret = process.env.SEPAY_WEBHOOK_SECRET?.trim();
  if (!secret || secret.length < MINIMUM_WEBHOOK_SECRET_LENGTH) {
    throw new Error(
      `SEPAY_WEBHOOK_SECRET must contain at least ${MINIMUM_WEBHOOK_SECRET_LENGTH} characters.`,
    );
  }
  return secret;
}

export function validateFinanceConfig(): void {
  if (isSepayWebhookEnabled()) getSepayWebhookSecret();
}

const DEFAULT_VNPAY_PAYMENT_URL =
  'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const DEFAULT_PAYMENT_TTL_MINUTES = 15;

export type VnpayConfig = {
  tmnCode: string | null;
  hashSecret: string | null;
  paymentUrl: string;
  returnUrl: string | null;
  isConfigured: boolean;
  paymentTtlMinutes: number;
};

export function getVnpayConfig(): VnpayConfig {
  const tmnCode = process.env.VNPAY_TMN_CODE?.trim() || null;
  const hashSecret = process.env.VNPAY_HASH_SECRET?.trim() || null;
  const paymentUrl =
    process.env.VNPAY_PAYMENT_URL?.trim() || DEFAULT_VNPAY_PAYMENT_URL;
  const returnUrl = process.env.VNPAY_RETURN_URL?.trim() || null;
  const rawTtl = Number(process.env.VNPAY_PAYMENT_TTL_MINUTES);
  const paymentTtlMinutes =
    Number.isSafeInteger(rawTtl) && rawTtl > 0
      ? rawTtl
      : DEFAULT_PAYMENT_TTL_MINUTES;

  return {
    tmnCode,
    hashSecret,
    paymentUrl,
    returnUrl,
    isConfigured: Boolean(tmnCode && hashSecret && returnUrl),
    paymentTtlMinutes,
  };
}

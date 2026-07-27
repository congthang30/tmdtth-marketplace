/**
 * Configuration for GHN (Giao Hang Nhanh) and GHTK (Giao Hang Tiet Kiem)
 * carrier API integrations. Follows the same process.env-based convention
 * used by other config modules in this backend (see upload.config.ts,
 * jwt.config.ts) rather than NestJS ConfigService.
 *
 * Sandbox/test endpoints and credentials come from each carrier's own
 * developer portal:
 *  - GHN sandbox: https://5sao.ghn.dev (Token + ShopId)
 *  - GHTK sandbox: https://khachhang-staging.ghtklab.com (Token)
 *
 * When the corresponding *_TOKEN env var is not set, the carrier client
 * operates in "unconfigured" mode: health checks report false and calls
 * that require the carrier throw a clear, actionable error instead of
 * silently failing or crashing the process. This lets the rest of the
 * app boot and be tested even before real sandbox credentials exist.
 */

const DEFAULT_GHN_BASE_URL =
  'https://dev-online-gateway.ghn.vn/shiip/public-api';
const DEFAULT_CARRIER_TIMEOUT_MS = 10_000;
const DEFAULT_CARRIER_RETRY_COUNT = 2;

export type GhnConfig = {
  baseUrl: string;
  token: string | null;
  shopId: string | null;
  isConfigured: boolean;
};

export function getGhnConfig(): GhnConfig {
  const baseUrl = (
    process.env.GHN_API_BASE_URL?.trim() || DEFAULT_GHN_BASE_URL
  ).replace(/\/+$/, '');
  const token = process.env.GHN_TOKEN?.trim() || null;
  const shopId = process.env.GHN_SHOP_ID?.trim() || null;

  return {
    baseUrl,
    token,
    shopId,
    isConfigured: Boolean(token && shopId),
  };
}

export function getCarrierTimeoutMs(): number {
  const raw = process.env.CARRIER_API_TIMEOUT_MS?.trim();
  if (!raw) {
    return DEFAULT_CARRIER_TIMEOUT_MS;
  }
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0
    ? value
    : DEFAULT_CARRIER_TIMEOUT_MS;
}

export function getCarrierRetryCount(): number {
  const raw = process.env.CARRIER_API_RETRY_COUNT?.trim();
  if (!raw) {
    return DEFAULT_CARRIER_RETRY_COUNT;
  }
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= 0
    ? value
    : DEFAULT_CARRIER_RETRY_COUNT;
}

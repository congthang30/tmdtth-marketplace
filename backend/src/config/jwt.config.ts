import type { StringValue } from 'ms';

export type JwtExpiresIn = StringValue | number;

const DEFAULT_JWT_EXPIRES_IN: StringValue = '1d';
const DEFAULT_JWT_SECRET = 'change-me-in-env';
const MS_DURATION_PATTERN =
  /^\d+(?:\.\d+)?(?:\s*(?:years?|yrs?|yr|y|weeks?|w|days?|d|hours?|hrs?|hr|h|minutes?|mins?|min|m|seconds?|secs?|sec|s|milliseconds?|msecs?|msec|ms))$/i;

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (secret?.trim()) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required when NODE_ENV=production.');
  }

  return DEFAULT_JWT_SECRET;
}

export function getJwtExpiresIn(): JwtExpiresIn {
  const rawValue = process.env.JWT_EXPIRES_IN?.trim();

  if (!rawValue) {
    return DEFAULT_JWT_EXPIRES_IN;
  }

  if (/^\d+(?:\.\d+)?$/.test(rawValue)) {
    return Number(rawValue);
  }

  if (MS_DURATION_PATTERN.test(rawValue)) {
    return rawValue as StringValue;
  }

  throw new Error(
    'JWT_EXPIRES_IN must be a number of seconds or a duration such as "1d", "2 hours", or "30m".',
  );
}

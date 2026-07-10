import axios from 'axios';
import type { ApiErrorPayload } from '@/types/api';

export class ApiClientError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly details: unknown[];

  constructor(params: {
    code: string;
    message: string;
    status?: number;
    details?: unknown[];
  }) {
    super(params.message);
    this.name = 'ApiClientError';
    this.code = params.code;
    this.status = params.status;
    this.details = params.details ?? [];
  }
}

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    (value as { success: unknown }).success === false &&
    'error' in value
  );
}

export function normalizeApiError(error: unknown) {
  if (error instanceof ApiClientError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const payload = error.response?.data;

    if (isApiErrorPayload(payload)) {
      return new ApiClientError({
        code: payload.error.code,
        message: payload.error.message,
        status,
        details: payload.error.details,
      });
    }

    return new ApiClientError({
      code: status ? `HTTP_${status}` : 'NETWORK_ERROR',
      message:
        status === undefined
          ? 'Cannot connect to the API. Check backend status and base URL.'
          : error.message,
      status,
    });
  }

  if (error instanceof Error) {
    return new ApiClientError({
      code: 'UNKNOWN_ERROR',
      message: error.message,
    });
  }

  return new ApiClientError({
    code: 'UNKNOWN_ERROR',
    message: 'Unexpected error',
  });
}

export function getErrorMessage(error: unknown) {
  return normalizeApiError(error).message;
}

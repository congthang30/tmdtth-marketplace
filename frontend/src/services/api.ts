import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth.store';
import type { ApiResponse } from '@/types/api';
import { normalizeApiError } from './errors';

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3100/api';

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = normalizeApiError(error);

    if (apiError.status === 401) {
      useAuthStore.getState().clearAuth();

      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }

    if (apiError.status === 403 && window.location.pathname !== '/forbidden') {
      window.location.assign('/forbidden');
    }

    return Promise.reject(apiError);
  },
);

async function unwrap<T>(request: Promise<{ data: ApiResponse<T> }>) {
  const response = await request;
  return response.data.data;
}

async function unwrapResponse<T>(request: Promise<{ data: ApiResponse<T> }>) {
  const response = await request;
  return response.data;
}

export function apiGet<T>(url: string, config?: AxiosRequestConfig) {
  return unwrap<T>(apiClient.get<ApiResponse<T>>(url, config));
}

export function apiGetResponse<T>(url: string, config?: AxiosRequestConfig) {
  return unwrapResponse<T>(apiClient.get<ApiResponse<T>>(url, config));
}

export function apiPost<T, TBody = unknown>(
  url: string,
  body?: TBody,
  config?: AxiosRequestConfig,
) {
  return unwrap<T>(apiClient.post<ApiResponse<T>>(url, body, config));
}

export function apiPut<T, TBody = unknown>(
  url: string,
  body?: TBody,
  config?: AxiosRequestConfig,
) {
  return unwrap<T>(apiClient.put<ApiResponse<T>>(url, body, config));
}

export function apiPatch<T, TBody = unknown>(
  url: string,
  body?: TBody,
  config?: AxiosRequestConfig,
) {
  return unwrap<T>(apiClient.patch<ApiResponse<T>>(url, body, config));
}

export function apiDelete<T>(url: string, config?: AxiosRequestConfig) {
  return unwrap<T>(apiClient.delete<ApiResponse<T>>(url, config));
}

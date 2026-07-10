import { apiGet } from './api';

export type HealthResponse = {
  status: string;
  service: string;
  timestamp: string;
  uptimeSeconds: number;
};

export const systemApi = {
  health() {
    return apiGet<HealthResponse>('/health');
  },
};

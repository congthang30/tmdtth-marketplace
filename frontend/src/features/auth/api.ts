import { apiGet, apiPost } from '@/services/api';
import type { AuthUser } from '@/types/domain';

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = LoginRequest & {
  fullName: string;
  phoneNumber?: string;
};

export type AuthResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: AuthUser;
};

export const authApi = {
  login(body: LoginRequest) {
    return apiPost<AuthResponse, LoginRequest>('/auth/login', body);
  },
  register(body: RegisterRequest) {
    return apiPost<AuthResponse, RegisterRequest>('/auth/register', body);
  },
  logout() {
    return apiPost<{ loggedOut: boolean }>('/auth/logout');
  },
  me() {
    return apiGet<AuthUser>('/auth/me');
  },
};

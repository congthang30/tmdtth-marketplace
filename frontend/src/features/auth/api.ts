import { apiGet, apiPost } from '@/services/api';
import type { AppRole, AuthUser } from '@/types/domain';

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

export type RoleCheckResponse = {
  role: AppRole;
  allowed: true;
  user: AuthUser;
};

const roleCheckPathByRole: Record<AppRole, string> = {
  Customer: '/auth/role-check/customer',
  Seller: '/auth/role-check/seller',
  Admin: '/auth/role-check/admin',
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
  roleCheck(role: AppRole) {
    return apiGet<RoleCheckResponse>(roleCheckPathByRole[role]);
  },
};

import type { AuthUser } from '@/types/domain';

export function getAuthenticatedHome(user: AuthUser): string {
  if (user.roles.includes('Admin') || user.roles.includes('Seller')) {
    return '/dashboard';
  }

  return '/products';
}

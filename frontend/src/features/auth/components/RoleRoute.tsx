import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { useAuthStore } from '@/stores/auth.store';
import type { AppRole } from '@/types/domain';
import { ProtectedRoute } from './ProtectedRoute';

type RoleRouteProps = {
  allowedRoles: AppRole[];
  children: ReactNode;
};

export function RoleRoute({ allowedRoles, children }: RoleRouteProps) {
  const user = useAuthStore((state) => state.user);
  const isSessionLoading = useAuthStore((state) => state.isSessionLoading);

  return (
    <ProtectedRoute>
      {isSessionLoading ? (
        <LoadingScreen label="Checking permissions..." />
      ) : user && user.roles.some((role) => allowedRoles.includes(role)) ? (
        children
      ) : (
        <Navigate to="/forbidden" replace />
      )}
    </ProtectedRoute>
  );
}

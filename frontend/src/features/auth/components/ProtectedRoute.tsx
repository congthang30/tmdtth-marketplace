import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { useAuthStore } from '@/stores/auth.store';

type ProtectedRouteProps = {
  children: ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isSessionLoading = useAuthStore((state) => state.isSessionLoading);
  const location = useLocation();

  if (!accessToken) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (isSessionLoading) {
    return <LoadingScreen label="Loading your session..." />;
  }

  return <>{children}</>;
}

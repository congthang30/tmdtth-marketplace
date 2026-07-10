import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { authApi } from '../api';

type AuthSessionProviderProps = {
  children: ReactNode;
};

export function AuthSessionProvider({ children }: AuthSessionProviderProps) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const setUser = useAuthStore((state) => state.setUser);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const setSessionLoading = useAuthStore((state) => state.setSessionLoading);

  const query = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.me,
    enabled: Boolean(accessToken),
    retry: false,
  });

  useEffect(() => {
    if (!accessToken) {
      setSessionLoading(false);
      return;
    }

    setSessionLoading(query.isLoading || query.isFetching);
  }, [accessToken, query.isFetching, query.isLoading, setSessionLoading]);

  useEffect(() => {
    if (query.data) {
      setUser(query.data);
      setSessionLoading(false);
    }
  }, [query.data, setSessionLoading, setUser]);

  useEffect(() => {
    if (query.isError) {
      clearAuth();
    }
  }, [clearAuth, query.isError]);

  return <>{children}</>;
}

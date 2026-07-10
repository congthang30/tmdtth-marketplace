import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ToastViewport } from '@/components/common/ToastViewport';
import { AuthSessionProvider } from '@/features/auth/components/AuthSessionProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
});

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthSessionProvider>{children}</AuthSessionProvider>
      <ToastViewport />
    </QueryClientProvider>
  );
}

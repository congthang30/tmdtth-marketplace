import { useMutation } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { authApi } from '../api';

type LogoutButtonProps = {
  className?: string;
};

export function LogoutButton({ className }: LogoutButtonProps) {
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      clearAuth();
      navigate('/');
    },
  });

  return (
    <button
      type="button"
      className={
        className ??
        'inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-surface'
      }
      disabled={mutation.isPending}
      onClick={() => mutation.mutate()}
    >
      <LogOut size={16} aria-hidden="true" />
      {mutation.isPending ? 'Logging out...' : 'Logout'}
    </button>
  );
}

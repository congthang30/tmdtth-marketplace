import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { LogIn } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { getErrorMessage } from '@/services/errors';
import { useAuthStore } from '@/stores/auth.store';
import { authApi } from '../api';

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

type LocationState = {
  from?: string;
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const accessToken = useAuthStore((state) => state.accessToken);
  const setAuth = useAuthStore((state) => state.setAuth);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAuth({ accessToken: data.accessToken, user: data.user });
      const state = location.state as LocationState | null;
      navigate(state?.from ?? '/dashboard', { replace: true });
    },
  });

  if (accessToken) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="mx-auto max-w-md rounded-lg border border-border bg-white p-6 shadow-panel">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
          Sign in
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Welcome back</h1>
        <p className="mt-2 text-sm text-muted">
          Use a seeded or registered account to access role-based workflows.
        </p>
      </div>

      {mutation.isError ? (
        <Alert tone="danger" className="mt-5">
          {getErrorMessage(mutation.error)}
        </Alert>
      ) : null}

      <form
        className="mt-6 space-y-4"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <TextInput
          label="Email"
          type="email"
          autoComplete="email"
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />
        <TextInput
          label="Password"
          type="password"
          autoComplete="current-password"
          error={form.formState.errors.password?.message}
          {...form.register('password')}
        />
        <Button type="submit" disabled={mutation.isPending} className="w-full">
          <LogIn size={16} aria-hidden="true" />
          {mutation.isPending ? 'Signing in...' : 'Login'}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        New here?{' '}
        <Link className="font-medium text-primary-700" to="/register">
          Create an account
        </Link>
      </p>
    </div>
  );
}

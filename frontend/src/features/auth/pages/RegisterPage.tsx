import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { getErrorMessage } from '@/services/errors';
import { useAuthStore } from '@/stores/auth.store';
import { authApi } from '../api';

const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(150, 'Full name is too long'),
  email: z.string().trim().email('Enter a valid email address'),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^[0-9+()\-\s]{8,20}$/, 'Enter a valid phone number')
    .optional()
    .or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const accessToken = useAuthStore((state) => state.accessToken);
  const setAuth = useAuthStore((state) => state.setAuth);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phoneNumber: '',
      password: '',
    },
  });

  const mutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      setAuth({ accessToken: data.accessToken, user: data.user });
      navigate('/dashboard', { replace: true });
    },
  });

  if (accessToken) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="mx-auto max-w-md rounded-lg border border-border bg-white p-6 shadow-panel">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
          Create account
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Start shopping</h1>
        <p className="mt-2 text-sm text-muted">
          Registered users can manage cart, addresses, orders and reviews.
        </p>
      </div>

      {mutation.isError ? (
        <Alert tone="danger" className="mt-5">
          {getErrorMessage(mutation.error)}
        </Alert>
      ) : null}

      <form
        className="mt-6 space-y-4"
        onSubmit={form.handleSubmit((values) =>
          mutation.mutate({
            ...values,
            phoneNumber: values.phoneNumber || undefined,
          }),
        )}
      >
        <TextInput
          label="Full name"
          autoComplete="name"
          error={form.formState.errors.fullName?.message}
          {...form.register('fullName')}
        />
        <TextInput
          label="Email"
          type="email"
          autoComplete="email"
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />
        <TextInput
          label="Phone"
          autoComplete="tel"
          error={form.formState.errors.phoneNumber?.message}
          {...form.register('phoneNumber')}
        />
        <TextInput
          label="Password"
          type="password"
          autoComplete="new-password"
          error={form.formState.errors.password?.message}
          {...form.register('password')}
        />
        <Button type="submit" disabled={mutation.isPending} className="w-full">
          <UserPlus size={16} aria-hidden="true" />
          {mutation.isPending ? 'Creating account...' : 'Register'}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link className="font-medium text-primary-700" to="/login">
          Login
        </Link>
      </p>
    </div>
  );
}

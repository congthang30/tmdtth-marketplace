import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Save, ShieldCheck, UserRound } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ErrorState } from '@/components/common/ErrorState';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SelectInput } from '@/components/ui/SelectInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextInput } from '@/components/ui/TextInput';
import { profileApi } from '@/features/account/api';
import { getErrorMessage } from '@/services/errors';
import { useAuthStore } from '@/stores/auth.store';
import { useToastStore } from '@/stores/toast.store';
import { formatStatus } from '@/utils/format';

const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(150, 'Full name is too long'),
  gender: z.string().max(20).optional(),
  dateOfBirth: z.string().optional(),
  avatarUrl: z.string().trim().max(1000, 'Avatar URL is too long').optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfilePage() {
  const setUser = useAuthStore((state) => state.setUser);
  const pushToast = useToastStore((state) => state.pushToast);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: '',
      gender: '',
      dateOfBirth: '',
      avatarUrl: '',
    },
  });

  const meQuery = useQuery({
    queryKey: ['account', 'me'],
    queryFn: profileApi.getMe,
  });

  useEffect(() => {
    if (!meQuery.data) {
      return;
    }

    form.reset({
      fullName: meQuery.data.profile?.fullName ?? '',
      gender: meQuery.data.profile?.gender ?? '',
      dateOfBirth: meQuery.data.profile?.dateOfBirth?.slice(0, 10) ?? '',
      avatarUrl: meQuery.data.profile?.avatarUrl ?? '',
    });
    setUser(meQuery.data);
  }, [form, meQuery.data, setUser]);

  const mutation = useMutation({
    mutationFn: profileApi.updateMe,
    onSuccess: (data) => {
      setUser(data);
      pushToast({
        tone: 'success',
        title: 'Profile updated',
        description: data.profile?.fullName ?? data.email,
      });
    },
  });

  if (meQuery.isLoading) {
    return (
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (meQuery.isError || !meQuery.data) {
    return (
      <ErrorState
        title="Cannot load profile"
        message="Your session may have expired or the users API is unavailable."
      />
    );
  }

  const user = meQuery.data;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
            Profile
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Account information</h1>
          <p className="mt-2 text-sm text-muted">
            This form updates `/users/me` and refreshes the active auth session.
          </p>
        </div>

        {mutation.isError ? (
          <Alert tone="danger" className="mt-5">
            {getErrorMessage(mutation.error)}
          </Alert>
        ) : null}

        <form
          className="mt-6 grid gap-4 sm:grid-cols-2"
          onSubmit={form.handleSubmit((values) =>
            mutation.mutate({
              fullName: values.fullName.trim(),
              gender: values.gender || null,
              dateOfBirth: values.dateOfBirth || null,
              avatarUrl: values.avatarUrl || null,
            }),
          )}
        >
          <TextInput
            label="Full name"
            autoComplete="name"
            error={form.formState.errors.fullName?.message}
            {...form.register('fullName')}
          />
          <SelectInput
            label="Gender"
            error={form.formState.errors.gender?.message}
            {...form.register('gender')}
          >
            <option value="">Not set</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
          </SelectInput>
          <TextInput
            label="Date of birth"
            type="date"
            error={form.formState.errors.dateOfBirth?.message}
            {...form.register('dateOfBirth')}
          />
          <TextInput
            label="Avatar URL"
            autoComplete="url"
            error={form.formState.errors.avatarUrl?.message}
            {...form.register('avatarUrl')}
          />
          <div className="sm:col-span-2">
            <Button type="submit" disabled={mutation.isPending}>
              <Save size={16} aria-hidden="true" />
              {mutation.isPending ? 'Saving...' : 'Save profile'}
            </Button>
          </div>
        </form>
      </section>

      <aside className="rounded-lg border border-border bg-white p-6 shadow-panel">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary-50 text-primary-700">
            <UserRound size={22} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">
              {user.profile?.fullName ?? user.email}
            </h2>
            <p className="mt-1 text-sm text-muted">{user.email}</p>
          </div>
        </div>

        <dl className="mt-6 space-y-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Phone</dt>
            <dd className="font-medium">{user.phoneNumber ?? 'Not set'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Status</dt>
            <dd className="font-medium">{formatStatus(user.userStatus)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Email</dt>
            <dd className="font-medium">
              {user.emailConfirmed ? 'Confirmed' : 'Unconfirmed'}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Phone</dt>
            <dd className="font-medium">
              {user.phoneConfirmed ? 'Confirmed' : 'Unconfirmed'}
            </dd>
          </div>
        </dl>

        <div className="mt-6">
          <p className="flex items-center gap-2 text-sm font-medium text-muted">
            <ShieldCheck size={16} aria-hidden="true" />
            Roles
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {user.roles.map((role) => (
              <Badge key={role}>{role}</Badge>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

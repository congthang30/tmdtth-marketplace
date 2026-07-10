import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Store } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { Textarea } from '@/components/ui/Textarea';
import { getErrorMessage } from '@/services/errors';
import { useToastStore } from '@/stores/toast.store';
import { sellerShopApi } from '../api';

const shopSchema = z.object({
  shopName: z.string().trim().min(2).max(150),
  description: z.string().trim().max(1000).optional(),
  email: z.string().trim().email().max(255).or(z.literal('')).optional(),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^[0-9+().\-\s]{7,20}$/)
    .or(z.literal(''))
    .optional(),
  province: z.string().trim().max(100).optional(),
  district: z.string().trim().max(100).optional(),
  ward: z.string().trim().max(100).optional(),
  streetAddress: z.string().trim().max(255).optional(),
  taxCode: z.string().trim().max(50).optional(),
});

type ShopFormValues = z.infer<typeof shopSchema>;

const cleanOptional = (value: string | undefined) => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : undefined;
};

export function SellerShopRegisterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const form = useForm<ShopFormValues>({
    resolver: zodResolver(shopSchema),
    defaultValues: {
      shopName: '',
      description: '',
      email: '',
      phoneNumber: '',
      province: '',
      district: '',
      ward: '',
      streetAddress: '',
      taxCode: '',
    },
  });

  const mutation = useMutation({
    mutationFn: sellerShopApi.createShop,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['seller', 'shop'] });
      pushToast({
        tone: 'success',
        title: 'Shop submitted',
        description: 'Admin approval is required before products can publish.',
      });
      navigate('/seller');
    },
  });

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
          Seller
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Register shop</h1>
        <p className="mt-2 text-sm text-muted">
          Submit your shop profile for admin approval.
        </p>
      </section>

      <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
        {mutation.isError ? (
          <Alert tone="danger" className="mb-5">
            {getErrorMessage(mutation.error)}
          </Alert>
        ) : null}
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={form.handleSubmit((values) =>
            mutation.mutate({
              shopName: values.shopName.trim(),
              description: cleanOptional(values.description),
              email: cleanOptional(values.email),
              phoneNumber: cleanOptional(values.phoneNumber),
              province: cleanOptional(values.province),
              district: cleanOptional(values.district),
              ward: cleanOptional(values.ward),
              streetAddress: cleanOptional(values.streetAddress),
              taxCode: cleanOptional(values.taxCode),
            }),
          )}
        >
          <TextInput
            label="Shop name"
            error={form.formState.errors.shopName?.message}
            {...form.register('shopName')}
          />
          <TextInput
            label="Email"
            type="email"
            error={form.formState.errors.email?.message}
            {...form.register('email')}
          />
          <TextInput
            label="Phone"
            error={form.formState.errors.phoneNumber?.message}
            {...form.register('phoneNumber')}
          />
          <TextInput
            label="Tax code"
            error={form.formState.errors.taxCode?.message}
            {...form.register('taxCode')}
          />
          <TextInput
            label="Province"
            error={form.formState.errors.province?.message}
            {...form.register('province')}
          />
          <TextInput
            label="District"
            error={form.formState.errors.district?.message}
            {...form.register('district')}
          />
          <TextInput
            label="Ward"
            error={form.formState.errors.ward?.message}
            {...form.register('ward')}
          />
          <TextInput
            label="Street address"
            error={form.formState.errors.streetAddress?.message}
            {...form.register('streetAddress')}
          />
          <Textarea
            label="Description"
            rows={4}
            className="md:col-span-2"
            error={form.formState.errors.description?.message}
            {...form.register('description')}
          />
          <div className="md:col-span-2">
            <Button type="submit" disabled={mutation.isPending}>
              <Store size={16} aria-hidden="true" />
              {mutation.isPending ? 'Submitting...' : 'Submit shop'}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

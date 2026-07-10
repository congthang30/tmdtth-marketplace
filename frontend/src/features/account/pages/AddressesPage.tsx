import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit, MapPin, Plus, Star, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextInput } from '@/components/ui/TextInput';
import { Textarea } from '@/components/ui/Textarea';
import { getErrorMessage } from '@/services/errors';
import { useToastStore } from '@/stores/toast.store';
import { addressesApi } from '../api';
import type { Address, AddressRequest } from '../types';

const addressSchema = z.object({
  receiverName: z
    .string()
    .trim()
    .min(2, 'Receiver name must be at least 2 characters')
    .max(150, 'Receiver name is too long'),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^[0-9+()\s-]{8,20}$/, 'Enter a valid phone number'),
  province: z.string().trim().min(2).max(100),
  district: z.string().trim().min(2).max(100),
  ward: z.string().trim().min(2).max(100),
  streetAddress: z.string().trim().min(2).max(255),
  fullAddress: z.string().trim().max(600).optional(),
  isDefault: z.boolean().optional(),
});

type AddressFormValues = z.infer<typeof addressSchema>;

type AddressFormModalProps = {
  open: boolean;
  address: Address | null;
  onClose: () => void;
};

const addressQueryKey = ['account', 'addresses'];

const toAddressRequest = (
  values: AddressFormValues,
  includeDefault: boolean,
): AddressRequest => ({
  receiverName: values.receiverName.trim(),
  phoneNumber: values.phoneNumber.trim(),
  province: values.province.trim(),
  district: values.district.trim(),
  ward: values.ward.trim(),
  streetAddress: values.streetAddress.trim(),
  fullAddress: values.fullAddress?.trim() || null,
  ...(includeDefault ? { isDefault: Boolean(values.isDefault) } : {}),
});

function AddressFormModal({
  open,
  address,
  onClose,
}: AddressFormModalProps) {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      receiverName: '',
      phoneNumber: '',
      province: '',
      district: '',
      ward: '',
      streetAddress: '',
      fullAddress: '',
      isDefault: false,
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset({
      receiverName: address?.receiverName ?? '',
      phoneNumber: address?.phoneNumber ?? '',
      province: address?.province ?? '',
      district: address?.district ?? '',
      ward: address?.ward ?? '',
      streetAddress: address?.streetAddress ?? '',
      fullAddress: address?.fullAddress ?? '',
      isDefault: address?.isDefault ?? false,
    });
  }, [address, form, open]);

  const mutation = useMutation({
    mutationFn: (values: AddressFormValues) =>
      address
        ? addressesApi.update(address.id, toAddressRequest(values, false))
        : addressesApi.create(toAddressRequest(values, true)),
    onSuccess: async (savedAddress) => {
      await queryClient.invalidateQueries({ queryKey: addressQueryKey });
      pushToast({
        tone: 'success',
        title: address ? 'Address updated' : 'Address created',
        description: savedAddress.fullAddress ?? savedAddress.streetAddress,
      });
      onClose();
    },
  });

  return (
    <Modal
      open={open}
      title={address ? 'Edit address' : 'New address'}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="address-form"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Saving...' : 'Save address'}
          </Button>
        </>
      }
    >
      {mutation.isError ? (
        <Alert tone="danger" className="mb-4">
          {getErrorMessage(mutation.error)}
        </Alert>
      ) : null}

      <form
        id="address-form"
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <TextInput
          label="Receiver"
          error={form.formState.errors.receiverName?.message}
          {...form.register('receiverName')}
        />
        <TextInput
          label="Phone"
          error={form.formState.errors.phoneNumber?.message}
          {...form.register('phoneNumber')}
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
        <div className="sm:col-span-2">
          <Textarea
            label="Full address"
            rows={3}
            error={form.formState.errors.fullAddress?.message}
            {...form.register('fullAddress')}
          />
        </div>
        {!address ? (
          <label className="flex items-center gap-2 text-sm font-medium text-ink sm:col-span-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border text-primary-600"
              {...form.register('isDefault')}
            />
            Set as default address
          </label>
        ) : null}
      </form>
    </Modal>
  );
}

export function AddressesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deletingAddress, setDeletingAddress] = useState<Address | null>(null);
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);

  const addressesQuery = useQuery({
    queryKey: addressQueryKey,
    queryFn: () => addressesApi.list(),
  });

  const setDefaultMutation = useMutation({
    mutationFn: addressesApi.setDefault,
    onSuccess: async (address) => {
      await queryClient.invalidateQueries({ queryKey: addressQueryKey });
      pushToast({
        tone: 'success',
        title: 'Default address updated',
        description: address.fullAddress ?? address.streetAddress,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: addressesApi.delete,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: addressQueryKey });
      pushToast({
        tone: 'success',
        title: 'Address deleted',
      });
      setDeletingAddress(null);
    },
  });

  const addresses = addressesQuery.data?.items ?? [];
  const openCreate = () => {
    setEditingAddress(null);
    setIsFormOpen(true);
  };
  const openEdit = (address: Address) => {
    setEditingAddress(address);
    setIsFormOpen(true);
  };
  const closeForm = () => {
    setIsFormOpen(false);
    setEditingAddress(null);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
              Addresses
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Delivery addresses</h1>
            <p className="mt-2 text-sm text-muted">
              Manage receiver, phone and default address for checkout.
            </p>
          </div>
          <Button type="button" onClick={openCreate}>
            <Plus size={16} aria-hidden="true" />
            New address
          </Button>
        </div>
      </section>

      {addressesQuery.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-56 w-full" />
          ))}
        </div>
      ) : null}

      {addressesQuery.isError ? (
        <ErrorState
          title="Cannot load addresses"
          message="Your session may have expired or the address API is unavailable."
        />
      ) : null}

      {!addressesQuery.isLoading && !addressesQuery.isError ? (
        addresses.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {addresses.map((address) => (
              <article
                key={address.id}
                className="rounded-lg border border-border bg-white p-5 shadow-panel"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-ink">
                        {address.receiverName}
                      </h2>
                      {address.isDefault ? <Badge>Default</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm text-muted">{address.phoneNumber}</p>
                  </div>
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-50 text-primary-700">
                    <MapPin size={18} aria-hidden="true" />
                  </span>
                </div>

                <p className="mt-4 text-sm leading-6 text-ink">
                  {address.fullAddress ??
                    `${address.streetAddress}, ${address.ward}, ${address.district}, ${address.province}`}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {!address.isDefault ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={setDefaultMutation.isPending}
                      onClick={() => setDefaultMutation.mutate(address.id)}
                    >
                      <Star size={16} aria-hidden="true" />
                      Set default
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => openEdit(address)}
                  >
                    <Edit size={16} aria-hidden="true" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => setDeletingAddress(address)}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    Delete
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No delivery addresses"
            description="Create a default address before checkout."
            action={
              <Button type="button" onClick={openCreate}>
                <Plus size={16} aria-hidden="true" />
                New address
              </Button>
            }
          />
        )
      ) : null}

      <AddressFormModal
        open={isFormOpen}
        address={editingAddress}
        onClose={closeForm}
      />

      <Modal
        open={Boolean(deletingAddress)}
        title="Delete address"
        onClose={() => setDeletingAddress(null)}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeletingAddress(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deletingAddress) {
                  deleteMutation.mutate(deletingAddress.id);
                }
              }}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </>
        }
      >
        {deleteMutation.isError ? (
          <Alert tone="danger" className="mb-4">
            {getErrorMessage(deleteMutation.error)}
          </Alert>
        ) : null}
        <p className="text-sm leading-6 text-muted">
          This removes the address for {deletingAddress?.receiverName}. Checkout
          will no longer offer it as a delivery option.
        </p>
      </Modal>
    </div>
  );
}

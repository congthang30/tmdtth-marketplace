import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, Warehouse } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { z } from 'zod';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextInput } from '@/components/ui/TextInput';
import { getErrorMessage } from '@/services/errors';
import { useToastStore } from '@/stores/toast.store';
import { formatDateTime } from '@/utils/format';
import { sellerProductsApi } from '../api';
import type { SellerVariant } from '../types';

const inventorySchema = z.object({
  quantityOnHand: z.coerce.number().int().min(0).max(100000000),
  lowStockThreshold: z.coerce.number().int().min(0).max(1000000),
});

type InventoryFormInput = z.input<typeof inventorySchema>;
type InventoryFormValues = z.output<typeof inventorySchema>;

function InventoryEditor({
  productId,
  variant,
}: {
  productId: string;
  variant: SellerVariant;
}) {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const form = useForm<InventoryFormInput, unknown, InventoryFormValues>({
    resolver: zodResolver(inventorySchema),
    defaultValues: {
      quantityOnHand: 0,
      lowStockThreshold: 5,
    },
  });
  const inventoryQuery = useQuery({
    queryKey: ['seller', 'products', productId, 'inventory', variant.id],
    queryFn: () => sellerProductsApi.getInventory(productId, variant.id),
  });
  const mutation = useMutation({
    mutationFn: (values: InventoryFormValues) =>
      sellerProductsApi.setInventory(productId, variant.id, values),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['seller', 'products', productId, 'inventory', variant.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ['seller', 'products', productId, 'variants'],
        }),
        queryClient.invalidateQueries({ queryKey: ['seller', 'products'] }),
      ]);
      pushToast({ tone: 'success', title: 'Inventory updated' });
    },
  });

  useEffect(() => {
    if (inventoryQuery.data) {
      form.reset({
        quantityOnHand: inventoryQuery.data.quantityOnHand,
        lowStockThreshold: inventoryQuery.data.lowStockThreshold,
      });
    }
  }, [form, inventoryQuery.data]);

  return (
    <article className="rounded-lg border border-border bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{variant.sku}</h2>
          <p className="text-sm text-muted">{variant.variantName}</p>
        </div>
        <p className="text-sm text-muted">
          Available: {inventoryQuery.data?.quantityAvailable ?? variant.quantityAvailable}
        </p>
      </div>

      {inventoryQuery.isLoading ? <Skeleton className="mt-4 h-24 w-full" /> : null}
      {inventoryQuery.isError ? (
        <Alert tone="danger" className="mt-4">
          {getErrorMessage(inventoryQuery.error)}
        </Alert>
      ) : null}
      {mutation.isError ? (
        <Alert tone="danger" className="mt-4">
          {getErrorMessage(mutation.error)}
        </Alert>
      ) : null}

      {!inventoryQuery.isLoading && !inventoryQuery.isError ? (
        <form
          className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto]"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <TextInput
            label="On hand"
            type="number"
            min={0}
            error={form.formState.errors.quantityOnHand?.message}
            {...form.register('quantityOnHand')}
          />
          <TextInput
            label="Low stock threshold"
            type="number"
            min={0}
            error={form.formState.errors.lowStockThreshold?.message}
            {...form.register('lowStockThreshold')}
          />
          <div className="flex items-end">
            <Button type="submit" disabled={mutation.isPending}>
              <Save size={16} aria-hidden="true" />
              {mutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      ) : null}

      <p className="mt-3 text-xs text-muted">
        Reserved: {inventoryQuery.data?.quantityReserved ?? 0} | Updated:{' '}
        {formatDateTime(inventoryQuery.data?.updatedAt)}
      </p>
    </article>
  );
}

export function SellerProductInventoryPage() {
  const { id } = useParams<{ id: string }>();
  const productId = id ?? '';
  const variantsQuery = useQuery({
    queryKey: ['seller', 'products', productId, 'variants'],
    queryFn: () => sellerProductsApi.listVariants(productId),
    enabled: Boolean(productId),
  });
  const variants = variantsQuery.data ?? [];

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
          Seller products
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Inventory</h1>
      </section>

      {variantsQuery.isLoading ? <Skeleton className="h-80 w-full" /> : null}
      {variantsQuery.isError ? (
        <ErrorState
          title="Cannot load variants"
          message="Inventory is managed per product variant."
        />
      ) : null}
      {!variantsQuery.isLoading && !variantsQuery.isError ? (
        variants.length > 0 ? (
          <div className="space-y-4">
            {variants.map((variant) => (
              <InventoryEditor
                key={variant.id}
                productId={productId}
                variant={variant}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No variants"
            description="Create variants before setting inventory."
            action={
              <Button type="button" variant="secondary">
                <Warehouse size={16} aria-hidden="true" />
                Inventory unavailable
              </Button>
            }
          />
        )
      ) : null}
    </div>
  );
}

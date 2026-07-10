import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit, Layers, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { z } from 'zod';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SelectInput } from '@/components/ui/SelectInput';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/Table';
import { TextInput } from '@/components/ui/TextInput';
import { Textarea } from '@/components/ui/Textarea';
import { getErrorMessage } from '@/services/errors';
import { useToastStore } from '@/stores/toast.store';
import { formatMoney, formatStatus } from '@/utils/format';
import { sellerProductsApi } from '../api';
import type { SellerVariant, VariantRequest } from '../types';

const moneyPattern = /^(0|[1-9]\d{0,15})(\.\d{1,2})?$/;
const integerPattern = /^\d*$/;

const variantSchema = z.object({
  sku: z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/),
  variantName: z.string().trim().min(1).max(255),
  variantOptionJson: z.string().trim().max(4000).optional(),
  price: z.string().trim().regex(moneyPattern),
  compareAtPrice: z.string().trim().regex(moneyPattern).or(z.literal('')).optional(),
  weightGram: z.string().regex(integerPattern).optional(),
  variantStatus: z.enum(['Active', 'Inactive']),
});

type VariantFormValues = z.infer<typeof variantSchema>;

const defaultValues: VariantFormValues = {
  sku: '',
  variantName: '',
  variantOptionJson: '',
  price: '',
  compareAtPrice: '',
  weightGram: '',
  variantStatus: 'Active',
};

const optionalString = (value: string | undefined) => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : undefined;
};

const toRequest = (values: VariantFormValues): VariantRequest => ({
  sku: values.sku.trim(),
  variantName: values.variantName.trim(),
  variantOptionJson: optionalString(values.variantOptionJson),
  price: values.price.trim(),
  compareAtPrice: optionalString(values.compareAtPrice),
  weightGram: optionalString(values.weightGram)
    ? Number(values.weightGram)
    : undefined,
  variantStatus: values.variantStatus,
});

const toFormValues = (variant: SellerVariant): VariantFormValues => ({
  sku: variant.sku,
  variantName: variant.variantName,
  variantOptionJson: variant.variantOptionJson ?? '',
  price: variant.price,
  compareAtPrice: variant.compareAtPrice ?? '',
  weightGram: String(variant.weightGram ?? ''),
  variantStatus: variant.variantStatus === 'Inactive' ? 'Inactive' : 'Active',
});

export function SellerProductVariantsPage() {
  const { id } = useParams<{ id: string }>();
  const [editingVariant, setEditingVariant] = useState<SellerVariant | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SellerVariant | null>(null);
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const form = useForm<VariantFormValues>({
    resolver: zodResolver(variantSchema),
    defaultValues,
  });
  const productId = id ?? '';
  const variantsQuery = useQuery({
    queryKey: ['seller', 'products', productId, 'variants'],
    queryFn: () => sellerProductsApi.listVariants(productId),
    enabled: Boolean(productId),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ['seller', 'products', productId, 'variants'],
    });

  const saveMutation = useMutation({
    mutationFn: (values: VariantFormValues) =>
      editingVariant
        ? sellerProductsApi.updateVariant(
            productId,
            editingVariant.id,
            toRequest(values),
          )
        : sellerProductsApi.createVariant(productId, toRequest(values)),
    onSuccess: async (variant) => {
      await invalidate();
      pushToast({ tone: 'success', title: 'Variant saved', description: variant.sku });
      setEditingVariant(null);
      setIsCreateOpen(false);
      form.reset(defaultValues);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (variantId: string) =>
      sellerProductsApi.deleteVariant(productId, variantId),
    onSuccess: async () => {
      await invalidate();
      pushToast({ tone: 'success', title: 'Variant deleted' });
      setDeleteTarget(null);
    },
  });

  useEffect(() => {
    if (editingVariant) {
      form.reset(toFormValues(editingVariant));
    } else if (isCreateOpen) {
      form.reset(defaultValues);
    }
  }, [editingVariant, form, isCreateOpen]);

  const isModalOpen = isCreateOpen || Boolean(editingVariant);

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
              Seller products
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Variants</h1>
          </div>
          <Button type="button" onClick={() => setIsCreateOpen(true)}>
            <Plus size={16} aria-hidden="true" />
            New variant
          </Button>
        </div>
      </section>

      {variantsQuery.isLoading ? <Skeleton className="h-80 w-full" /> : null}
      {variantsQuery.isError ? (
        <ErrorState
          title="Cannot load variants"
          message="The product variants API is unavailable."
        />
      ) : null}
      {!variantsQuery.isLoading && !variantsQuery.isError ? (
        (variantsQuery.data ?? []).length > 0 ? (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>SKU</TableHeaderCell>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Price</TableHeaderCell>
                <TableHeaderCell>Available</TableHeaderCell>
                <TableHeaderCell className="text-right">Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(variantsQuery.data ?? []).map((variant) => (
                <TableRow key={variant.id}>
                  <TableCell className="font-medium">{variant.sku}</TableCell>
                  <TableCell>{variant.variantName}</TableCell>
                  <TableCell>
                    <Badge>{formatStatus(variant.variantStatus)}</Badge>
                  </TableCell>
                  <TableCell>{formatMoney(variant.price)}</TableCell>
                  <TableCell>{variant.quantityAvailable}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setEditingVariant(variant)}
                      >
                        <Edit size={15} aria-hidden="true" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => setDeleteTarget(variant)}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            title="No variants"
            description="Add at least one variant before setting inventory."
            action={
              <Button type="button" onClick={() => setIsCreateOpen(true)}>
                <Layers size={16} aria-hidden="true" />
                New variant
              </Button>
            }
          />
        )
      ) : null}

      <Modal
        open={isModalOpen}
        title={editingVariant ? 'Edit variant' : 'Create variant'}
        onClose={() => {
          setEditingVariant(null);
          setIsCreateOpen(false);
        }}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditingVariant(null);
                setIsCreateOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="variant-form"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </>
        }
      >
        {saveMutation.isError ? (
          <Alert tone="danger" className="mb-4">
            {getErrorMessage(saveMutation.error)}
          </Alert>
        ) : null}
        <form
          id="variant-form"
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
        >
          <TextInput
            label="SKU"
            error={form.formState.errors.sku?.message}
            {...form.register('sku')}
          />
          <TextInput
            label="Variant name"
            error={form.formState.errors.variantName?.message}
            {...form.register('variantName')}
          />
          <TextInput
            label="Price"
            inputMode="decimal"
            error={form.formState.errors.price?.message}
            {...form.register('price')}
          />
          <TextInput
            label="Compare at price"
            inputMode="decimal"
            error={form.formState.errors.compareAtPrice?.message}
            {...form.register('compareAtPrice')}
          />
          <TextInput
            label="Weight grams"
            inputMode="numeric"
            error={form.formState.errors.weightGram?.message}
            {...form.register('weightGram')}
          />
          <SelectInput
            label="Status"
            error={form.formState.errors.variantStatus?.message}
            {...form.register('variantStatus')}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </SelectInput>
          <Textarea
            label="Options JSON"
            rows={3}
            error={form.formState.errors.variantOptionJson?.message}
            {...form.register('variantOptionJson')}
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        title="Delete variant"
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          {deleteMutation.isError
            ? getErrorMessage(deleteMutation.error)
            : `Delete variant ${deleteTarget?.sku ?? ''}?`}
        </p>
      </Modal>
    </div>
  );
}

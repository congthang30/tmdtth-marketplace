import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit, FolderPlus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { formatStatus } from '@/utils/format';
import { adminCategoriesApi } from '../api';
import type { AdminCategory, CategoryRequest } from '../types';

const categorySchema = z.object({
  categoryName: z.string().trim().min(2).max(150),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(180)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(500).optional(),
  parentCategoryId: z.string().optional(),
  sortOrder: z.string().regex(/^\d*$/).optional(),
  isActive: z.boolean().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

const defaultValues: CategoryFormValues = {
  categoryName: '',
  slug: '',
  description: '',
  parentCategoryId: '',
  sortOrder: '0',
  isActive: true,
};

const optionalString = (value: string | undefined) => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : undefined;
};

const toRequest = (values: CategoryFormValues): CategoryRequest => ({
  categoryName: values.categoryName.trim(),
  slug: values.slug.trim(),
  description: optionalString(values.description) ?? null,
  parentCategoryId: optionalString(values.parentCategoryId) ?? null,
  sortOrder: optionalString(values.sortOrder) ? Number(values.sortOrder) : 0,
  isActive: values.isActive,
});

const toFormValues = (category: AdminCategory): CategoryFormValues => ({
  categoryName: category.categoryName,
  slug: category.slug,
  description: category.description ?? '',
  parentCategoryId: category.parentCategoryId ?? '',
  sortOrder: String(category.sortOrder),
  isActive: category.isActive,
});

export function AdminCategoriesPage() {
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null);
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues,
  });
  const categoriesQuery = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: adminCategoriesApi.list,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });

  const saveMutation = useMutation({
    mutationFn: (values: CategoryFormValues) =>
      editingCategory
        ? adminCategoriesApi.update(editingCategory.id, toRequest(values))
        : adminCategoriesApi.create(toRequest(values)),
    onSuccess: async () => {
      await invalidate();
      pushToast({ tone: 'success', title: 'Category saved' });
      setEditingCategory(null);
      setIsCreateOpen(false);
      form.reset(defaultValues);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (categoryId: string) => adminCategoriesApi.deactivate(categoryId),
    onSuccess: async () => {
      await invalidate();
      pushToast({ tone: 'success', title: 'Category deactivated' });
      setDeleteTarget(null);
    },
  });

  useEffect(() => {
    if (editingCategory) {
      form.reset(toFormValues(editingCategory));
    } else if (isCreateOpen) {
      form.reset(defaultValues);
    }
  }, [editingCategory, form, isCreateOpen]);

  const categories = categoriesQuery.data ?? [];
  const isModalOpen = isCreateOpen || Boolean(editingCategory);

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
              Admin catalog
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Categories</h1>
          </div>
          <Button type="button" onClick={() => setIsCreateOpen(true)}>
            <FolderPlus size={16} aria-hidden="true" />
            New category
          </Button>
        </div>
      </section>

      {categoriesQuery.isLoading ? <Skeleton className="h-96 w-full" /> : null}
      {categoriesQuery.isError ? (
        <ErrorState title="Cannot load categories" message="Admin category API failed." />
      ) : null}
      {!categoriesQuery.isLoading && !categoriesQuery.isError ? (
        categories.length > 0 ? (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Slug</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Sort</TableHeaderCell>
                <TableHeaderCell className="text-right">Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.categoryName}</TableCell>
                  <TableCell>{category.slug}</TableCell>
                  <TableCell>
                    <Badge>{formatStatus(category.isActive ? 'Active' : 'Inactive')}</Badge>
                  </TableCell>
                  <TableCell>{category.sortOrder}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setEditingCategory(category)}
                      >
                        <Edit size={15} aria-hidden="true" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => setDeleteTarget(category)}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                        Deactivate
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState title="No categories" description="Create the first category." />
        )
      ) : null}

      <Modal
        open={isModalOpen}
        title={editingCategory ? 'Edit category' : 'Create category'}
        onClose={() => {
          setEditingCategory(null);
          setIsCreateOpen(false);
        }}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditingCategory(null);
                setIsCreateOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" form="category-form" disabled={saveMutation.isPending}>
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
          id="category-form"
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
        >
          <TextInput
            label="Category name"
            error={form.formState.errors.categoryName?.message}
            {...form.register('categoryName')}
          />
          <TextInput
            label="Slug"
            error={form.formState.errors.slug?.message}
            {...form.register('slug')}
          />
          <SelectInput
            label="Parent"
            error={form.formState.errors.parentCategoryId?.message}
            {...form.register('parentCategoryId')}
          >
            <option value="">No parent</option>
            {categories
              .filter((category) => category.id !== editingCategory?.id)
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.categoryName}
                </option>
              ))}
          </SelectInput>
          <TextInput
            label="Sort order"
            inputMode="numeric"
            error={form.formState.errors.sortOrder?.message}
            {...form.register('sortOrder')}
          />
          <Textarea
            label="Description"
            rows={3}
            error={form.formState.errors.description?.message}
            {...form.register('description')}
          />
          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input type="checkbox" {...form.register('isActive')} />
            Active
          </label>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        title="Deactivate category"
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
              disabled={deactivateMutation.isPending}
              onClick={() => deleteTarget && deactivateMutation.mutate(deleteTarget.id)}
            >
              {deactivateMutation.isPending ? 'Deactivating...' : 'Deactivate'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          {deactivateMutation.isError
            ? getErrorMessage(deactivateMutation.error)
            : `Deactivate ${deleteTarget?.categoryName ?? 'this category'}?`}
        </p>
      </Modal>
    </div>
  );
}

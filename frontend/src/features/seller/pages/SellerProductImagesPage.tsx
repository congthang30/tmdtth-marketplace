import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Star, Trash2, Upload } from 'lucide-react';
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
import { TextInput } from '@/components/ui/TextInput';
import { resolveMediaUrl } from '@/features/catalog/utils';
import { getErrorMessage } from '@/services/errors';
import { useToastStore } from '@/stores/toast.store';
import { sellerProductsApi, sellerUploadsApi } from '../api';
import type { ProductImageRequest, SellerImage } from '../types';

const imageSchema = z.object({
  productVariantId: z.string().optional(),
  imageUrl: z.string().trim().regex(/^(\/uploads\/\S+|https?:\/\/\S+)$/),
  altText: z.string().trim().max(255).optional(),
  sortOrder: z.string().regex(/^\d*$/).optional(),
  isThumbnail: z.boolean().optional(),
});

type ImageFormValues = z.infer<typeof imageSchema>;

const defaultValues: ImageFormValues = {
  productVariantId: '',
  imageUrl: '',
  altText: '',
  sortOrder: '0',
  isThumbnail: false,
};

const optionalString = (value: string | undefined) => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : undefined;
};

const toRequest = (values: ImageFormValues): ProductImageRequest => ({
  productVariantId: optionalString(values.productVariantId),
  imageUrl: values.imageUrl.trim(),
  altText: optionalString(values.altText),
  sortOrder: optionalString(values.sortOrder) ? Number(values.sortOrder) : undefined,
  isThumbnail: values.isThumbnail,
});

const toFormValues = (image: SellerImage): ImageFormValues => ({
  productVariantId: image.productVariantId ?? '',
  imageUrl: image.imageUrl,
  altText: image.altText ?? '',
  sortOrder: String(image.sortOrder),
  isThumbnail: image.isThumbnail,
});

export function SellerProductImagesPage() {
  const { id } = useParams<{ id: string }>();
  const productId = id ?? '';
  const [editingImage, setEditingImage] = useState<SellerImage | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SellerImage | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const form = useForm<ImageFormValues>({
    resolver: zodResolver(imageSchema),
    defaultValues,
  });
  const imagesQuery = useQuery({
    queryKey: ['seller', 'products', productId, 'images'],
    queryFn: () => sellerProductsApi.listImages(productId),
    enabled: Boolean(productId),
  });
  const variantsQuery = useQuery({
    queryKey: ['seller', 'products', productId, 'variants'],
    queryFn: () => sellerProductsApi.listVariants(productId),
    enabled: Boolean(productId),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ['seller', 'products', productId, 'images'],
    });

  const uploadMutation = useMutation({
    mutationFn: (selectedFile: File) => sellerUploadsApi.upload(selectedFile),
    onSuccess: (uploaded) => {
      form.setValue('imageUrl', uploaded.url, { shouldValidate: true });
      pushToast({ tone: 'success', title: 'Image uploaded' });
    },
  });

  const saveMutation = useMutation({
    mutationFn: (values: ImageFormValues) =>
      editingImage
        ? sellerProductsApi.updateImage(productId, editingImage.id, toRequest(values))
        : sellerProductsApi.createImage(productId, toRequest(values)),
    onSuccess: async () => {
      await invalidate();
      pushToast({ tone: 'success', title: 'Image saved' });
      setEditingImage(null);
      setIsCreateOpen(false);
      form.reset(defaultValues);
      setFile(null);
    },
  });

  const thumbnailMutation = useMutation({
    mutationFn: (imageId: string) =>
      sellerProductsApi.updateImage(productId, imageId, { isThumbnail: true }),
    onSuccess: async () => {
      await invalidate();
      pushToast({ tone: 'success', title: 'Thumbnail updated' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (imageId: string) => sellerProductsApi.deleteImage(productId, imageId),
    onSuccess: async () => {
      await invalidate();
      pushToast({ tone: 'success', title: 'Image deleted' });
      setDeleteTarget(null);
    },
  });

  useEffect(() => {
    if (editingImage) {
      form.reset(toFormValues(editingImage));
    } else if (isCreateOpen) {
      form.reset(defaultValues);
      setFile(null);
    }
  }, [editingImage, form, isCreateOpen]);

  const isModalOpen = isCreateOpen || Boolean(editingImage);
  const images = imagesQuery.data ?? [];
  const variants = variantsQuery.data ?? [];

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
              Seller products
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Images</h1>
          </div>
          <Button type="button" onClick={() => setIsCreateOpen(true)}>
            <ImagePlus size={16} aria-hidden="true" />
            New image
          </Button>
        </div>
      </section>

      {imagesQuery.isLoading ? <Skeleton className="h-80 w-full" /> : null}
      {imagesQuery.isError ? (
        <ErrorState
          title="Cannot load images"
          message="The product image API is unavailable."
        />
      ) : null}
      {!imagesQuery.isLoading && !imagesQuery.isError ? (
        images.length > 0 ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {images.map((image) => (
              <article
                key={image.id}
                className="overflow-hidden rounded-lg border border-border bg-white shadow-panel"
              >
                <div className="aspect-[4/3] bg-surface">
                  {resolveMediaUrl(image.imageUrl) ? (
                    <img
                      src={resolveMediaUrl(image.imageUrl) ?? undefined}
                      alt={image.altText ?? ''}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {image.isThumbnail ? <Badge>Thumbnail</Badge> : null}
                    <Badge>Sort {image.sortOrder}</Badge>
                  </div>
                  <p className="truncate text-sm text-muted">{image.imageUrl}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setEditingImage(image)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={image.isThumbnail || thumbnailMutation.isPending}
                      onClick={() => thumbnailMutation.mutate(image.id)}
                    >
                      <Star size={15} aria-hidden="true" />
                      Thumbnail
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => setDeleteTarget(image)}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                      Delete
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <EmptyState
            title="No images"
            description="Upload or add an image URL for this product."
            action={
              <Button type="button" onClick={() => setIsCreateOpen(true)}>
                <ImagePlus size={16} aria-hidden="true" />
                New image
              </Button>
            }
          />
        )
      ) : null}

      <Modal
        open={isModalOpen}
        title={editingImage ? 'Edit image' : 'Create image'}
        onClose={() => {
          setEditingImage(null);
          setIsCreateOpen(false);
        }}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditingImage(null);
                setIsCreateOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="image-form"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </>
        }
      >
        {saveMutation.isError || uploadMutation.isError ? (
          <Alert tone="danger" className="mb-4">
            {getErrorMessage(saveMutation.error ?? uploadMutation.error)}
          </Alert>
        ) : null}
        <div className="mb-4 flex flex-col gap-2 rounded-md border border-border bg-surface p-3">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={!file || uploadMutation.isPending}
            onClick={() => file && uploadMutation.mutate(file)}
          >
            <Upload size={16} aria-hidden="true" />
            {uploadMutation.isPending ? 'Uploading...' : 'Upload selected file'}
          </Button>
        </div>
        <form
          id="image-form"
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
        >
          <TextInput
            label="Image URL"
            error={form.formState.errors.imageUrl?.message}
            {...form.register('imageUrl')}
          />
          <SelectInput
            label="Variant"
            error={form.formState.errors.productVariantId?.message}
            {...form.register('productVariantId')}
          >
            <option value="">Product-level image</option>
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.sku} - {variant.variantName}
              </option>
            ))}
          </SelectInput>
          <TextInput
            label="Alt text"
            error={form.formState.errors.altText?.message}
            {...form.register('altText')}
          />
          <TextInput
            label="Sort order"
            inputMode="numeric"
            error={form.formState.errors.sortOrder?.message}
            {...form.register('sortOrder')}
          />
          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input type="checkbox" {...form.register('isThumbnail')} />
            Thumbnail
          </label>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        title="Delete image"
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
            : 'Delete this product image?'}
        </p>
      </Modal>
    </div>
  );
}

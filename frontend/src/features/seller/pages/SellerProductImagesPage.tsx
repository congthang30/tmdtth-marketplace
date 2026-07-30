import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Star, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import { z } from "zod";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SelectInput } from "@/components/ui/SelectInput";
import { Skeleton } from "@/components/ui/Skeleton";
import { TextInput } from "@/components/ui/TextInput";
import { resolveMediaUrl } from "@/features/catalog/utils";
import { getErrorMessage } from "@/services/errors";
import { useToastStore } from "@/stores/toast.store";
import { sellerProductsApi, sellerUploadsApi } from "../api";
import type { ProductImageRequest, SellerImage } from "../types";

const imageSchema = z.object({
  productVariantId: z.string().optional(),
  assetId: z.string().trim().optional(),
  altText: z.string().trim().max(255, "Văn bản thay thế quá dài").optional(),
  sortOrder: z
    .string()
    .regex(/^\d*$/, "Thứ tự phải là số nguyên không âm")
    .optional(),
  isThumbnail: z.boolean().optional(),
});

type ImageFormValues = z.infer<typeof imageSchema>;

const defaultValues: ImageFormValues = {
  productVariantId: "",
  assetId: "",
  altText: "",
  sortOrder: "0",
  isThumbnail: false,
};

const optionalString = (value: string | undefined) => {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : undefined;
};

const toRequest = (values: ImageFormValues): ProductImageRequest => ({
  productVariantId: optionalString(values.productVariantId),
  assetId: optionalString(values.assetId),
  altText: optionalString(values.altText),
  sortOrder: optionalString(values.sortOrder)
    ? Number(values.sortOrder)
    : undefined,
  isThumbnail: values.isThumbnail,
});

const toFormValues = (image: SellerImage): ImageFormValues => ({
  productVariantId: image.productVariantId ?? "",
  assetId: "",
  altText: image.altText ?? "",
  sortOrder: String(image.sortOrder),
  isThumbnail: image.isThumbnail,
});

export function SellerProductImagesPage() {
  const { id } = useParams<{ id: string }>();
  const productId = id ?? "";
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
    queryKey: ["seller", "products", productId, "images"],
    queryFn: () => sellerProductsApi.listImages(productId),
    enabled: Boolean(productId),
  });
  const variantsQuery = useQuery({
    queryKey: ["seller", "products", productId, "variants"],
    queryFn: () => sellerProductsApi.listVariants(productId),
    enabled: Boolean(productId),
  });
  const uploadsQuery = useQuery({
    queryKey: ["seller", "uploads"],
    queryFn: () => sellerUploadsApi.list(1, 8),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["seller", "products", productId, "images"],
    });

  const uploadMutation = useMutation({
    mutationFn: (selectedFile: File) => sellerUploadsApi.upload(selectedFile),
    onSuccess: async (uploaded) => {
      await queryClient.invalidateQueries({ queryKey: ["seller", "uploads"] });
      form.setValue("assetId", uploaded.assetId, { shouldValidate: true });
      pushToast({ tone: "success", title: "Đã tải hình ảnh lên" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: (values: ImageFormValues) =>
      editingImage
        ? sellerProductsApi.updateImage(
            productId,
            editingImage.id,
            toRequest(values),
          )
        : sellerProductsApi.createImage(productId, toRequest(values)),
    onSuccess: async () => {
      await Promise.all([
        invalidate(),
        queryClient.invalidateQueries({ queryKey: ["catalog"] }),
        queryClient.invalidateQueries({ queryKey: ["seller", "products"] }),
      ]);
      pushToast({ tone: "success", title: "Đã lưu hình ảnh" });
      setEditingImage(null);
      setIsCreateOpen(false);
      form.reset(defaultValues);
      setFile(null);
    },
  });

  const closeImageModal = () => {
    saveMutation.reset();
    uploadMutation.reset();
    form.reset(defaultValues);
    setFile(null);
    setEditingImage(null);
    setIsCreateOpen(false);
  };

  const openCreateImage = () => {
    saveMutation.reset();
    uploadMutation.reset();
    setEditingImage(null);
    setIsCreateOpen(true);
  };

  const openEditImage = (image: SellerImage) => {
    saveMutation.reset();
    uploadMutation.reset();
    setIsCreateOpen(false);
    setEditingImage(image);
  };

  const thumbnailMutation = useMutation({
    mutationFn: (imageId: string) =>
      sellerProductsApi.updateImage(productId, imageId, { isThumbnail: true }),
    onSuccess: async () => {
      await Promise.all([
        invalidate(),
        queryClient.invalidateQueries({ queryKey: ["catalog"] }),
        queryClient.invalidateQueries({ queryKey: ["seller", "products"] }),
      ]);
      pushToast({ tone: "success", title: "Đã cập nhật ảnh đại diện" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (imageId: string) =>
      sellerProductsApi.deleteImage(productId, imageId),
    onSuccess: async () => {
      await invalidate();
      pushToast({ tone: "success", title: "Đã xóa hình ảnh" });
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
  const uploads = uploadsQuery.data?.items ?? [];

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
              Sản phẩm của gian hàng
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Hình ảnh sản phẩm</h1>
          </div>
          <Button type="button" onClick={openCreateImage}>
            <ImagePlus size={16} aria-hidden="true" />
            Thêm hình ảnh
          </Button>
        </div>
      </section>

      {imagesQuery.isLoading ? <Skeleton className="h-80 w-full" /> : null}
      {imagesQuery.isError ? (
        <ErrorState
          title="Không thể tải hình ảnh"
          message="Hệ thống đang tạm thời gián đoạn. Vui lòng thử lại."
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
                      alt={image.altText ?? ""}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {image.isThumbnail ? <Badge>Ảnh đại diện</Badge> : null}
                    <Badge>Thứ tự {image.sortOrder}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => openEditImage(image)}
                    >
                      Chỉnh sửa
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={
                        image.isThumbnail || thumbnailMutation.isPending
                      }
                      onClick={() => thumbnailMutation.mutate(image.id)}
                    >
                      <Star size={15} aria-hidden="true" />
                      Đặt làm ảnh đại diện
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => setDeleteTarget(image)}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                      Xóa
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <EmptyState
            title="Chưa có hình ảnh"
            description="Hãy chọn và tải hình ảnh lên cho sản phẩm này."
            action={
              <Button type="button" onClick={openCreateImage}>
                <ImagePlus size={16} aria-hidden="true" />
                Thêm hình ảnh
              </Button>
            }
          />
        )
      ) : null}

      <Modal
        open={isModalOpen}
        title={editingImage ? "Chỉnh sửa hình ảnh" : "Thêm hình ảnh"}
        onClose={closeImageModal}
        closeDisabled={saveMutation.isPending || uploadMutation.isPending}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={saveMutation.isPending || uploadMutation.isPending}
              onClick={closeImageModal}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              form="image-form"
              disabled={saveMutation.isPending || uploadMutation.isPending}
            >
              {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
            </Button>
          </>
        }
      >
        {saveMutation.isError || uploadMutation.isError ? (
          <Alert tone="danger" className="mb-4">
            {getErrorMessage(saveMutation.error ?? uploadMutation.error)}
          </Alert>
        ) : null}
        <div className="mb-4 flex flex-col gap-3 rounded-md border border-border bg-surface p-3">
          <label htmlFor="product-image-file" className="text-sm font-medium text-ink">
            Chọn hình ảnh
          </label>
          <input
            id="product-image-file"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            disabled={uploadMutation.isPending}
            onChange={(event) => {
              const selectedFile = event.target.files?.[0] ?? null;
              setFile(selectedFile);
              if (selectedFile) {
                uploadMutation.mutate(selectedFile);
              }
            }}
          />
          {uploadMutation.isPending ? (
            <p className="flex min-h-11 items-center text-sm font-medium text-primary-700">Đang tải hình ảnh lên...</p>
          ) : file && form.formState.dirtyFields.assetId ? (
            <p className="text-sm font-medium text-success">Ảnh mới đã tải lên và sẵn sàng để lưu.</p>
          ) : editingImage ? (
            <p className="text-xs text-muted">Chọn tệp mới để thay thế hình ảnh hiện tại.</p>
          ) : (
            <p className="text-xs text-muted">Chọn tệp, hệ thống sẽ tự động tải ảnh lên.</p>
          )}
          {form.formState.errors.assetId ? (
            <p className="text-xs text-danger">{form.formState.errors.assetId.message}</p>
          ) : null}
        </div>
        {uploadsQuery.isLoading ? (
          <Skeleton className="mb-4 h-24 w-full" />
        ) : uploads.length > 0 ? (
          <div className="mb-4 rounded-md border border-border bg-white p-3">
            <p className="text-sm font-semibold text-ink">
              Tệp tải lên gần đây
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {uploads.map((upload) => (
                <button
                  key={upload.assetId}
                  type="button"
                  className="flex items-center gap-3 rounded-md border border-border bg-surface p-2 text-left text-sm hover:border-primary-300"
                  onClick={() =>
                    form.setValue("assetId", upload.assetId, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                >
                  <span className="h-12 w-12 overflow-hidden rounded bg-white">
                    <img
                      src={resolveMediaUrl(upload.url) ?? undefined}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">
                      {upload.fileName}
                    </span>
                    <span className="text-xs text-muted">
                      {Math.round(upload.size / 1024)} KB
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <form
          id="image-form"
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => {
            if (!editingImage && !values.assetId) {
              form.setError("assetId", { message: "Vui lòng chọn và tải hình ảnh lên" });
              return;
            }
            saveMutation.mutate(values);
          })}
        >
          <SelectInput
            label="Phân loại"
            error={form.formState.errors.productVariantId?.message}
            {...form.register("productVariantId")}
          >
            <option value="">Hình ảnh chung của sản phẩm</option>
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.sku} - {variant.variantName}
              </option>
            ))}
          </SelectInput>
          <TextInput
            label="Văn bản thay thế"
            error={form.formState.errors.altText?.message}
            {...form.register("altText")}
          />
          <TextInput
            label="Thứ tự hiển thị"
            inputMode="numeric"
            error={form.formState.errors.sortOrder?.message}
            {...form.register("sortOrder")}
          />
          <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-ink">
            <input className="h-5 w-5" type="checkbox" {...form.register("isThumbnail")} />
            Đặt làm ảnh đại diện
          </label>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        title="Xóa hình ảnh"
        onClose={() => {
          if (!deleteMutation.isPending) {
            deleteMutation.reset();
            setDeleteTarget(null);
          }
        }}
        closeDisabled={deleteMutation.isPending}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={deleteMutation.isPending}
              onClick={() => {
                deleteMutation.reset();
                setDeleteTarget(null);
              }}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={deleteMutation.isPending}
              onClick={() =>
                deleteTarget && deleteMutation.mutate(deleteTarget.id)
              }
            >
              {deleteMutation.isPending ? "Đang xóa..." : "Xóa"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          {deleteMutation.isError
            ? getErrorMessage(deleteMutation.error)
            : "Bạn có muốn xóa hình ảnh sản phẩm này không?"}
        </p>
      </Modal>
    </div>
  );
}

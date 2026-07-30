import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, ImageOff, Link2, Store } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { VietnamAddressFields } from "@/components/commerce/VietnamAddressFields";
import { ErrorState } from "@/components/common/ErrorState";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { TextInput } from "@/components/ui/TextInput";
import { resolveMediaUrl } from "@/features/catalog/utils";
import { getErrorMessage } from "@/services/errors";
import { useToastStore } from "@/stores/toast.store";
import { sellerShopApi, sellerUploadsApi } from "../api";
import type { Shop, ShopProfileRequest } from "../types";

const PHONE_PATTERN = /^(?=(?:\D*\d){8,15}\D*$)\+?[0-9()\-\s]+$/;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const DEFAULT_MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const profileSchema = z.object({
  shopName: z
    .string()
    .trim()
    .min(2, "Tên gian hàng phải có ít nhất 2 ký tự")
    .max(150, "Tên gian hàng tối đa 150 ký tự"),
  description: z
    .string()
    .trim()
    .max(1000, "Giới thiệu tối đa 1.000 ký tự"),
  email: z
    .string()
    .trim()
    .refine(
      (value) => !value || z.email().safeParse(value).success,
      "Địa chỉ email không đúng định dạng",
    ),
  phoneNumber: z
    .string()
    .trim()
    .refine(
      (value) => !value || PHONE_PATTERN.test(value),
      "Số điện thoại phải có 8–15 chữ số và chỉ dùng dấu +, khoảng trắng, ngoặc hoặc gạch nối",
    ),
  province: z.string().trim().max(100),
  ward: z.string().trim().max(100),
  streetAddress: z.string().trim().max(255, "Địa chỉ tối đa 255 ký tự"),
});

type ProfileValues = z.infer<typeof profileSchema>;
type AvatarChange = { assetId: string; url: string } | null | undefined;

const toValues = (shop: Shop): ProfileValues => ({
  shopName: shop.shopName,
  description: shop.description ?? "",
  email: shop.email ?? "",
  phoneNumber: shop.phoneNumber ?? "",
  province: shop.province ?? "",
  ward: shop.ward ?? "",
  streetAddress: shop.streetAddress ?? "",
});

const optional = (value: string) => value.trim() || undefined;

export function SellerShopProfilePage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const [avatarChange, setAvatarChange] = useState<AvatarChange>(undefined);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      shopName: "",
      description: "",
      email: "",
      phoneNumber: "",
      province: "",
      ward: "",
      streetAddress: "",
    },
  });
  const shopQuery = useQuery({
    queryKey: ["seller", "shop", "me"],
    queryFn: sellerShopApi.getMyShop,
    retry: false,
  });
  const uploadMutation = useMutation({
    mutationFn: sellerUploadsApi.upload,
    onSuccess: (uploaded) => {
      setAvatarChange({ assetId: uploaded.assetId, url: uploaded.url });
      setImageLoadFailed(false);
      setFileError(null);
    },
  });
  const saveMutation = useMutation({
    mutationFn: (body: ShopProfileRequest) => sellerShopApi.updateProfile(body),
    onSuccess: async (shop) => {
      form.reset(toValues(shop));
      setAvatarChange(undefined);
      setImageLoadFailed(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["seller", "shop"] }),
        queryClient.invalidateQueries({ queryKey: ["shops", shop.slug] }),
      ]);
      pushToast({
        tone: "success",
        title: "Đã lưu thông tin gian hàng",
        description: "Khách hàng sẽ thấy thông tin mới trên trang gian hàng.",
      });
    },
  });

  useEffect(() => {
    if (shopQuery.data) {
      form.reset(toValues(shopQuery.data));
      setAvatarChange(undefined);
      setImageLoadFailed(false);
    }
  }, [form, shopQuery.data]);

  const currentAvatarUrl = useMemo(
    () =>
      avatarChange === null
        ? null
        : resolveMediaUrl(avatarChange?.url ?? shopQuery.data?.avatarUrl),
    [avatarChange, shopQuery.data?.avatarUrl],
  );
  const isBusy = uploadMutation.isPending || saveMutation.isPending;

  if (shopQuery.isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-[38rem] w-full" />
      </div>
    );
  }

  if (shopQuery.isError) {
    return (
      <ErrorState
        title="Không thể tải thông tin gian hàng"
        message="Hệ thống đang tạm thời gián đoạn. Vui lòng thử lại."
        action={
          <Button type="button" onClick={() => void shopQuery.refetch()}>
            Thử lại
          </Button>
        }
      />
    );
  }

  const shop = shopQuery.data;
  if (!shop || shop.shopStatus !== "Approved") {
    return (
      <ErrorState
        title="Chưa thể chỉnh thông tin gian hàng"
        message="Hãy hoàn tất hoặc theo dõi hồ sơ người bán. Sau khi gian hàng được duyệt, Bạn có thể cập nhật thông tin tại đây."
        action={
          <Link
            to="/seller/shop/register"
            className="inline-flex min-h-11 items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Mở hồ sơ người bán
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-xl border border-border bg-white shadow-panel">
        <div className="bg-gradient-to-r from-primary-700 to-primary-500 px-5 py-6 text-white sm:px-7 sm:py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/75">
            Kênh người bán
          </p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
            Thông tin gian hàng
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/85">
            Cập nhật hình ảnh và thông tin khách hàng nhìn thấy. Địa chỉ bên
            dưới cũng được dùng làm địa chỉ lấy hàng cho vận chuyển mới.
          </p>
        </div>
      </header>

      <form
        className="space-y-5"
        onSubmit={form.handleSubmit((values) => {
          saveMutation.reset();
          const body: ShopProfileRequest = {
            shopName: values.shopName.trim(),
            description: optional(values.description),
            email: optional(values.email),
            phoneNumber: optional(values.phoneNumber),
            province: optional(values.province),
            ward: optional(values.ward),
            streetAddress: optional(values.streetAddress),
            ...(avatarChange === undefined
              ? {}
              : {
                  avatarAssetId:
                    avatarChange === null ? null : avatarChange.assetId,
                }),
          };
          saveMutation.mutate(body);
        })}
      >
        <section className="grid gap-6 rounded-xl border border-border bg-white p-5 shadow-panel sm:p-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div>
            <h2 className="text-lg font-semibold text-ink">Ảnh đại diện</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Ảnh vuông, rõ nét giúp khách hàng nhận biết gian hàng nhanh hơn.
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="grid h-32 w-32 shrink-0 place-items-center overflow-hidden rounded-2xl border border-border bg-primary-50 text-primary-700 shadow-sm">
              {currentAvatarUrl && !imageLoadFailed ? (
                <img
                  src={currentAvatarUrl}
                  alt={`Ảnh đại diện ${shop.shopName}`}
                  className="h-full w-full object-cover"
                  onError={() => setImageLoadFailed(true)}
                />
              ) : (
                <Store size={42} aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap gap-2">
                <label
                  htmlFor="shop-avatar-file"
                  className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus-within:ring-2 focus-within:ring-primary-600 focus-within:ring-offset-2"
                >
                  <Camera size={17} aria-hidden="true" />
                  {uploadMutation.isPending ? "Đang tải ảnh..." : "Chọn ảnh mới"}
                  <input
                    id="shop-avatar-file"
                    type="file"
                    className="sr-only"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    disabled={isBusy}
                    aria-describedby="shop-avatar-help shop-avatar-status"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      uploadMutation.reset();
                      setFileError(null);
                      if (!file) return;
                      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
                        setFileError("Chỉ hỗ trợ ảnh JPG, PNG, WebP hoặc GIF.");
                        return;
                      }
                      if (file.size > DEFAULT_MAX_IMAGE_BYTES) {
                        setFileError("Ảnh phải có dung lượng không quá 5 MB.");
                        return;
                      }
                      uploadMutation.mutate(file);
                    }}
                  />
                </label>
                {currentAvatarUrl || avatarChange ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isBusy}
                    onClick={() => {
                      setAvatarChange(null);
                      setImageLoadFailed(false);
                      setFileError(null);
                      uploadMutation.reset();
                    }}
                  >
                    <ImageOff size={17} aria-hidden="true" />
                    Bỏ ảnh
                  </Button>
                ) : null}
              </div>
              <p id="shop-avatar-help" className="text-xs leading-5 text-muted">
                JPG, PNG, WebP hoặc GIF; tối đa 5 MB. Ảnh chỉ được gắn vào gian
                hàng sau khi Bạn lưu biểu mẫu.
              </p>
              <div id="shop-avatar-status" aria-live="polite">
                {uploadMutation.isPending ? (
                  <p className="text-sm font-medium text-primary-700">
                    Đang tải ảnh lên an toàn...
                  </p>
                ) : avatarChange && avatarChange !== null ? (
                  <p className="text-sm font-medium text-success">
                    Ảnh mới đã sẵn sàng để lưu.
                  </p>
                ) : fileError || uploadMutation.isError ? (
                  <p className="text-sm font-medium text-danger">
                    {fileError ?? getErrorMessage(uploadMutation.error)}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 rounded-xl border border-border bg-white p-5 shadow-panel sm:p-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              Thông tin hiển thị
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Tên và giới thiệu được hiển thị công khai trên trang gian hàng.
            </p>
          </div>
          <div className="grid gap-4">
            <TextInput
              id="shop-profile-name"
              label="Tên gian hàng"
              maxLength={150}
              required
              disabled={isBusy}
              error={form.formState.errors.shopName?.message}
              {...form.register("shopName")}
            />
            <Textarea
              id="shop-profile-description"
              label="Giới thiệu gian hàng"
              maxLength={1000}
              disabled={isBusy}
              error={form.formState.errors.description?.message}
              {...form.register("description")}
            />
            <div className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Link2 size={17} aria-hidden="true" />
                Đường dẫn gian hàng
              </div>
              <p className="mt-2 break-all text-sm text-primary-700">
                /shops/{shop.slug}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Đường dẫn được giữ nguyên khi đổi tên để liên kết đã chia sẻ
                không bị gián đoạn.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 rounded-xl border border-border bg-white p-5 shadow-panel sm:p-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              Liên hệ và lấy hàng
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Thông tin này hỗ trợ khách hàng và đối tác vận chuyển liên hệ.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <TextInput
              id="shop-profile-email"
              label="Email liên hệ"
              type="email"
              maxLength={255}
              disabled={isBusy}
              error={form.formState.errors.email?.message}
              {...form.register("email")}
            />
            <TextInput
              id="shop-profile-phone"
              label="Số điện thoại liên hệ"
              inputMode="tel"
              maxLength={20}
              disabled={isBusy}
              error={form.formState.errors.phoneNumber?.message}
              {...form.register("phoneNumber")}
            />
            <VietnamAddressFields
              value={{
                province: form.watch("province"),
                ward: form.watch("ward"),
              }}
              onChange={(next) => {
                form.setValue("province", next.province, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
                form.setValue("ward", next.ward, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
              errors={{
                province: form.formState.errors.province?.message,
                ward: form.formState.errors.ward?.message,
              }}
              names={{
                province: "shop-profile-province",
                ward: "shop-profile-ward",
              }}
            />
            <div className="md:col-span-2">
              <TextInput
                id="shop-profile-street-address"
                label="Số nhà, tên đường"
                maxLength={255}
                disabled={isBusy}
                error={form.formState.errors.streetAddress?.message}
                {...form.register("streetAddress")}
              />
            </div>
            <Alert className="md:col-span-2">
              Địa chỉ mới chỉ áp dụng cho vận chuyển được tạo sau khi lưu. Đơn
              và vận chuyển đã có không bị thay đổi.
            </Alert>
          </div>
        </section>

        {saveMutation.isError ? (
          <Alert tone="danger">
            Không thể lưu thông tin gian hàng: {getErrorMessage(saveMutation.error)}
          </Alert>
        ) : null}

        <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-xl border border-border bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted" aria-live="polite">
            {saveMutation.isPending
              ? "Đang lưu thông tin gian hàng..."
              : uploadMutation.isPending
                ? "Vui lòng chờ ảnh tải xong trước khi lưu."
                : form.formState.isDirty || avatarChange !== undefined
                  ? "Bạn có thay đổi chưa lưu."
                  : "Thông tin đang hiển thị là phiên bản đã lưu."}
          </p>
          <Button
            id="save-shop-profile-button"
            type="submit"
            className="w-full sm:w-auto"
            disabled={isBusy || (!form.formState.isDirty && avatarChange === undefined)}
          >
            {saveMutation.isPending
              ? "Đang lưu..."
              : "Lưu thông tin gian hàng"}
          </Button>
        </div>
      </form>
    </div>
  );
}

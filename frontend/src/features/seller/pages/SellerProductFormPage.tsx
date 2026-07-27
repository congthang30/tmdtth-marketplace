import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { ErrorState } from "@/components/common/ErrorState";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { SelectInput } from "@/components/ui/SelectInput";
import { Skeleton } from "@/components/ui/Skeleton";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import { categoriesApi } from "@/features/catalog/api";
import { flattenCategories } from "@/features/catalog/utils";
import { getErrorMessage } from "@/services/errors";
import { useToastStore } from "@/stores/toast.store";
import { formatMoney, formatStatus } from "@/utils/format";
import { sellerProductsApi, sellerShopApi } from "../api";
import { sellerShopCategoriesApi } from "@/features/shops/seller-api";
import type { SellerShopCategory } from "@/features/shops/seller-api";
import type { ProductRequest, SellerProduct } from "../types";

const moneyPattern = /^(0|[1-9]\d{0,15})(\.\d{1,2})?$/;
const integerPattern = /^\d*$/;

const productSchema = z.object({
  categoryId: z.string().min(1, "Vui lòng chọn danh mục"),
  productName: z
    .string()
    .trim()
    .min(2, "Tên sản phẩm phải có ít nhất 2 ký tự")
    .max(255, "Tên sản phẩm quá dài"),
  description: z.string().trim().max(5000, "Mô tả quá dài").optional(),
  brand: z.string().trim().max(150, "Tên thương hiệu quá dài").optional(),
  basePrice: z.string().trim().regex(moneyPattern, "Giá bán không hợp lệ"),
  compareAtPrice: z
    .string()
    .trim()
    .regex(moneyPattern, "Giá so sánh không hợp lệ")
    .or(z.literal(""))
    .optional(),
  warrantyMonths: z
    .string()
    .regex(integerPattern, "Số tháng bảo hành phải là số nguyên không âm")
    .optional(),
  weightGram: z
    .string()
    .regex(integerPattern, "Khối lượng phải là số nguyên không âm")
    .optional(),
  productStatus: z.enum(["Draft", "Published"]),
  shopCategoryIds: z.array(z.string()),
});

type ProductFormValues = z.infer<typeof productSchema>;

const defaultValues: ProductFormValues = {
  categoryId: "",
  productName: "",
  description: "",
  brand: "",
  basePrice: "",
  compareAtPrice: "",
  warrantyMonths: "",
  weightGram: "",
  productStatus: "Draft",
  shopCategoryIds: [],
};

const optionalString = (value: string | undefined) => {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : undefined;
};

const optionalNumber = (value: string | undefined) => {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? Number(trimmed) : undefined;
};

function toFormValues(product: SellerProduct, shopCategories: SellerShopCategory[]): ProductFormValues {
  return {
    categoryId: product.category.id,
    productName: product.productName,
    description: product.description ?? "",
    brand: product.brand ?? "",
    basePrice: product.basePrice,
    compareAtPrice: product.compareAtPrice ?? "",
    warrantyMonths: "",
    weightGram: "",
    productStatus:
      product.productStatus === "Published" ? "Published" : "Draft",
    shopCategoryIds: shopCategories
      .filter((category) => category.productIds.includes(product.id))
      .map((category) => category.id),
  };
}

function toRequest(values: ProductFormValues, shopId?: string): ProductRequest {
  return {
    ...(shopId ? { shopId } : {}),
    categoryId: values.categoryId,
    productName: values.productName.trim(),
    description: optionalString(values.description),
    brand: optionalString(values.brand),
    basePrice: values.basePrice.trim(),
    compareAtPrice: optionalString(values.compareAtPrice),
    warrantyMonths: optionalNumber(values.warrantyMonths),
    weightGram: optionalNumber(values.weightGram),
    productStatus: values.productStatus,
  };
}

export function SellerProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues,
  });

  const shopQuery = useQuery({
    queryKey: ["seller", "shop", "me"],
    queryFn: sellerShopApi.getMyShop,
  });
  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesApi.list,
  });
  const shopCategoriesQuery = useQuery({
    queryKey: ["seller", "shop-categories", "product-form"],
    queryFn: sellerShopCategoriesApi.list,
  });
  const productsQuery = useQuery({
    queryKey: ["seller", "products", "lookup"],
    queryFn: () => sellerProductsApi.list(1, 100),
    enabled: isEdit,
  });

  const product = productsQuery.data?.items.find((item) => item.id === id);
  const categories = flattenCategories(categoriesQuery.data ?? []);
  const watchedBasePrice = form.watch("basePrice");
  const watchedCompareAtPrice = form.watch("compareAtPrice");
  const numericBasePrice = Number(watchedBasePrice || 0);
  const numericCompareAtPrice = Number(watchedCompareAtPrice || 0);
  const discountPercent = numericCompareAtPrice > numericBasePrice && numericBasePrice > 0
    ? Math.round((1 - numericBasePrice / numericCompareAtPrice) * 100)
    : 0;

  const shopCategories = shopCategoriesQuery.data ?? [];

  useEffect(() => {
    if (product && shopCategoriesQuery.isSuccess) {
      form.reset(toFormValues(product, shopCategories));
    }
  }, [form, product, shopCategories, shopCategoriesQuery.isSuccess]);

  const mutation = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      const savedProduct = isEdit && id
        ? await sellerProductsApi.update(id, toRequest(values))
        : await sellerProductsApi.create(toRequest(values, shopQuery.data?.id));
      await Promise.all(
        shopCategories.map((category) => {
          const shouldContain = values.shopCategoryIds.includes(category.id);
          const productIds = category.productIds.filter((productId) => productId !== savedProduct.id);
          if (shouldContain) productIds.push(savedProduct.id);
          const changed = shouldContain !== category.productIds.includes(savedProduct.id);
          return changed
            ? sellerShopCategoriesApi.assignProducts(category.id, productIds)
            : Promise.resolve();
        }),
      );
      return savedProduct;
    },
    onSuccess: async (savedProduct) => {
       await Promise.all([
         queryClient.invalidateQueries({ queryKey: ["seller", "products"] }),
         queryClient.invalidateQueries({ queryKey: ["seller", "shop-categories"] }),
       ]);
      pushToast({
        tone: "success",
        title: isEdit ? "Đã cập nhật sản phẩm" : "Đã tạo sản phẩm",
        description: savedProduct.productName,
      });
      navigate("/seller/products");
    },
  });

  if (
    shopQuery.isLoading ||
    categoriesQuery.isLoading ||
    shopCategoriesQuery.isLoading ||
    productsQuery.isLoading
  ) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (shopQuery.isError || categoriesQuery.isError || shopCategoriesQuery.isError || productsQuery.isError) {
    return (
      <ErrorState
        title="Không thể tải biểu mẫu sản phẩm"
        message="Không thể tải dữ liệu gian hàng, sản phẩm hoặc danh mục."
      />
    );
  }

  if (!shopQuery.data) {
    return (
      <ErrorState
        title="Hãy đăng ký gian hàng trước"
        message="Bạn cần có gian hàng trước khi tạo sản phẩm."
      />
    );
  }

  if (isEdit && !product) {
    return (
      <ErrorState
        title="Không tìm thấy sản phẩm"
        message="Sản phẩm không thuộc danh sách của gian hàng hiện tại."
      />
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
          Sản phẩm của gian hàng
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">
            {isEdit ? "Chỉnh sửa sản phẩm" : "Tạo sản phẩm"}
          </h1>
          <span className="text-sm text-muted">
            Gian hàng: {shopQuery.data.shopName} (
            {formatStatus(shopQuery.data.shopStatus)})
          </span>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
        {mutation.isError ? (
          <Alert tone="danger" className="mb-5">
            {getErrorMessage(mutation.error)}
          </Alert>
        ) : null}
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <TextInput
            label="Tên sản phẩm"
            error={form.formState.errors.productName?.message}
            {...form.register("productName")}
          />
          <SelectInput
            label="Danh mục"
            error={form.formState.errors.categoryId?.message}
            {...form.register("categoryId")}
          >
            <option value="">Chọn danh mục</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </SelectInput>
          <div>
            <TextInput
              label="Giá bán mặc định"
              inputMode="decimal"
              error={form.formState.errors.basePrice?.message}
              {...form.register("basePrice")}
            />
            <p className="mt-1 text-xs text-muted">Giá này được dùng làm giá gợi ý khi tạo phân loại mới.</p>
          </div>
          <div>
            <TextInput
              label="Giá gốc trước giảm (không bắt buộc)"
              inputMode="decimal"
              error={form.formState.errors.compareAtPrice?.message}
              {...form.register("compareAtPrice")}
            />
            <p className="mt-1 text-xs text-muted">Phải lớn hơn hoặc bằng giá bán mặc định.</p>
          </div>
          {numericBasePrice > 0 ? (
            <div className="md:col-span-2 rounded-lg border border-primary-100 bg-primary-50 p-4" aria-live="polite">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Giá khách hàng nhìn thấy</p>
              <div className="mt-2 flex flex-wrap items-baseline gap-3">
                <strong className="text-2xl text-primary-700">{formatMoney(String(numericBasePrice))}</strong>
                {numericCompareAtPrice > numericBasePrice ? <span className="text-sm text-muted line-through">{formatMoney(String(numericCompareAtPrice))}</span> : null}
                {discountPercent > 0 ? <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-primary-700">Giảm {discountPercent}%</span> : null}
              </div>
            </div>
          ) : null}
          <TextInput
            label="Thương hiệu"
            error={form.formState.errors.brand?.message}
            {...form.register("brand")}
          />
          <SelectInput
            label="Trạng thái"
            error={form.formState.errors.productStatus?.message}
            {...form.register("productStatus")}
          >
            <option value="Draft">Bản nháp</option>
            <option value="Published">Đã đăng bán</option>
          </SelectInput>
          <TextInput
            label="Thời hạn bảo hành (tháng)"
            inputMode="numeric"
            error={form.formState.errors.warrantyMonths?.message}
            {...form.register("warrantyMonths")}
          />
          <TextInput
            label="Khối lượng (gam)"
            inputMode="numeric"
            error={form.formState.errors.weightGram?.message}
            {...form.register("weightGram")}
          />
          <fieldset className="md:col-span-2 rounded-lg border border-border p-4">
            <legend className="px-1 text-sm font-medium text-ink">Danh mục của gian hàng</legend>
            {shopCategories.length > 0 ? (
              <div className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                {shopCategories.filter((category) => category.isActive).map((category) => (
                  <label key={category.id} className="flex min-h-11 items-center gap-3 rounded-md px-2 hover:bg-surface">
                    <input
                      type="checkbox"
                      value={category.id}
                      className="h-5 w-5 accent-primary-600"
                      {...form.register("shopCategoryIds")}
                    />
                    <span className="text-sm">{category.categoryName}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">Chưa có danh mục riêng. Hãy tạo tại mục Danh mục của gian hàng.</p>
            )}
          </fieldset>
          <Textarea
            label="Mô tả"
            rows={5}
            className="md:col-span-2"
            error={form.formState.errors.description?.message}
            {...form.register("description")}
          />
          <div className="md:col-span-2">
            <Button type="submit" disabled={mutation.isPending}>
              <Save size={16} aria-hidden="true" />
              {mutation.isPending ? "Đang lưu..." : "Lưu sản phẩm"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

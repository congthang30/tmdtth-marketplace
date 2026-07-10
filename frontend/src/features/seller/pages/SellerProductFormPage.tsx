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
import { formatStatus } from "@/utils/format";
import { sellerProductsApi, sellerShopApi } from "../api";
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
};

const optionalString = (value: string | undefined) => {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : undefined;
};

const optionalNumber = (value: string | undefined) => {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? Number(trimmed) : undefined;
};

function toFormValues(product: SellerProduct): ProductFormValues {
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
  const productsQuery = useQuery({
    queryKey: ["seller", "products", "lookup"],
    queryFn: () => sellerProductsApi.list(1, 100),
    enabled: isEdit,
  });

  const product = productsQuery.data?.items.find((item) => item.id === id);
  const categories = flattenCategories(categoriesQuery.data ?? []);

  useEffect(() => {
    if (product) {
      form.reset(toFormValues(product));
    }
  }, [form, product]);

  const mutation = useMutation({
    mutationFn: (values: ProductFormValues) =>
      isEdit && id
        ? sellerProductsApi.update(id, toRequest(values))
        : sellerProductsApi.create(toRequest(values, shopQuery.data?.id)),
    onSuccess: async (savedProduct) => {
      await queryClient.invalidateQueries({ queryKey: ["seller", "products"] });
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
    productsQuery.isLoading
  ) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (shopQuery.isError || categoriesQuery.isError || productsQuery.isError) {
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
          <TextInput
            label="Giá bán"
            inputMode="decimal"
            error={form.formState.errors.basePrice?.message}
            {...form.register("basePrice")}
          />
          <TextInput
            label="Giá so sánh"
            inputMode="decimal"
            error={form.formState.errors.compareAtPrice?.message}
            {...form.register("compareAtPrice")}
          />
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

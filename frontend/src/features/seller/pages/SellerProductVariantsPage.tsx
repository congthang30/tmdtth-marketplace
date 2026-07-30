import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  Edit,
  Layers,
  LockKeyhole,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import { z } from "zod";
import { EmptyState } from "@/components/common/EmptyState";
import { ManagementSearch } from "@/components/data-display/ManagementSearch";
import { ErrorState } from "@/components/common/ErrorState";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SelectInput } from "@/components/ui/SelectInput";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { TextInput } from "@/components/ui/TextInput";
import { getErrorMessage } from "@/services/errors";
import { useToastStore } from "@/stores/toast.store";
import { formatMoney, formatStatus } from "@/utils/format";
import { sellerProductsApi } from "../api";
import { sellerSaleCampaignsApi } from "@/features/shops/sale-api";
import type { SaleCampaign } from "@/features/shops/sale-api";
import type { SellerVariant, VariantUpdateRequest } from "../types";

const moneyPattern = /^(0|[1-9]\d{0,15})(\.\d{1,2})?$/;
const integerPattern = /^\d*$/;

const variantSchema = z.object({
  price: z.string().trim().regex(moneyPattern, "Giá bán không hợp lệ"),
  compareAtPrice: z
    .string()
    .trim()
    .regex(moneyPattern, "Giá so sánh không hợp lệ")
    .or(z.literal(""))
    .optional(),
  weightGram: z
    .string()
    .regex(integerPattern, "Khối lượng phải là số nguyên không âm")
    .refine(
      (value) => !value || Number(value) <= 100_000_000,
      "Khối lượng không được vượt quá 100.000.000 gam",
    )
    .optional(),
  quantityOnHand: z
    .string()
    .regex(/^\d+$/, "Tồn kho ban đầu phải là số nguyên không âm")
    .refine(
      (value) => Number(value) <= 100_000_000,
      "Tồn kho không được vượt quá 100.000.000",
    ),
  variantStatus: z.enum(["Active", "Inactive"]),
});

type VariantFormValues = z.infer<typeof variantSchema>;

const defaultValues: VariantFormValues = {
  price: "",
  compareAtPrice: "",
  weightGram: "",
  quantityOnHand: "0",
  variantStatus: "Active",
};

const optionalString = (value: string | undefined) => {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : undefined;
};

const toUpdateRequest = (values: VariantFormValues): VariantUpdateRequest => ({
  price: values.price.trim(),
  compareAtPrice: optionalString(values.compareAtPrice),
  weightGram: optionalString(values.weightGram)
    ? Number(values.weightGram)
    : undefined,
  variantStatus: values.variantStatus,
});

const toFormValues = (variant: SellerVariant): VariantFormValues => ({
  price: variant.price,
  compareAtPrice: variant.compareAtPrice ?? "",
  weightGram: String(variant.weightGram ?? ""),
  quantityOnHand: String(variant.quantityAvailable),
  variantStatus: variant.variantStatus === "Inactive" ? "Inactive" : "Active",
});

type AttributeRow = { id: number; name: string; value: string };
const emptyAttribute = (id: number): AttributeRow => ({ id, name: "", value: "" });
const parseAttributes = (variant: Pick<SellerVariant, "attributes">): AttributeRow[] => {
  const entries = Object.entries(variant.attributes).filter(([, value]) => typeof value === "string");
  return entries.length > 0
    ? entries.map(([name, value], index) => ({ id: index + 1, name, value }))
    : [emptyAttribute(1)];
};
const splitAttributeValues = (value: string) =>
  value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
const serializeAttributes = (attributes: AttributeRow[]) =>
  Object.fromEntries(
    attributes
      .map(({ name, value }) => [name.trim(), value.trim()] as const)
      .filter(([name, value]) => name && value),
  );
const createAttributeCombinations = (attributes: AttributeRow[]) =>
  attributes.reduce<Record<string, string>[]>(
    (combinations, attribute) =>
      combinations.flatMap((combination) =>
        splitAttributeValues(attribute.value).map((value) => ({
          ...combination,
          [attribute.name.trim()]: value,
        })),
      ),
    [{}],
  );

export function SellerProductVariantsPage() {
  const { id } = useParams<{ id: string }>();
  const [editingVariant, setEditingVariant] = useState<SellerVariant | null>(
    null,
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SellerVariant | null>(null);
  const [attributes, setAttributes] = useState<AttributeRow[]>([emptyAttribute(1)]);
  const [attributeError, setAttributeError] = useState<string | null>(null);
  const [saleTarget, setSaleTarget] = useState<SellerVariant | null>(null);
  const [salePrice, setSalePrice] = useState("");
  const [saleStartsAt, setSaleStartsAt] = useState("");
  const [saleEndsAt, setSaleEndsAt] = useState("");
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const form = useForm<VariantFormValues>({
    resolver: zodResolver(variantSchema),
    defaultValues,
  });
  const productId = id ?? "";
  const variantsQuery = useQuery({
    queryKey: ["seller", "products", productId, "variants"],
    queryFn: () => sellerProductsApi.listVariants(productId),
    enabled: Boolean(productId),
  });
  const productQuery = useQuery({
    queryKey: ["seller", "products", "detail", productId],
    queryFn: () => sellerProductsApi.get(productId),
    enabled: Boolean(productId),
  });
  const saleCampaignsQuery = useQuery({
    queryKey: ["seller", "sale-campaigns"],
    queryFn: sellerSaleCampaignsApi.list,
  });
  const saleByVariant = new Map<string, SaleCampaign>();
  for (const campaign of saleCampaignsQuery.data ?? []) {
    if (campaign.status === "Scheduled" || campaign.status === "Active") {
      for (const item of campaign.items) saleByVariant.set(item.productVariantId, campaign);
    }
  }
  const normalizedSearch = search.trim().toLocaleLowerCase("vi");
  const filteredVariants = (variantsQuery.data ?? []).filter((variant) => {
    const campaign = saleByVariant.get(variant.id);
    return `${variant.sku} ${variant.variantName} ${campaign ? campaign.status : "chưa đặt lịch"}`
      .toLocaleLowerCase("vi").includes(normalizedSearch);
  });
  const watchedPrice = form.watch("price");
  const watchedCompareAtPrice = form.watch("compareAtPrice");
  const numericPrice = Number(watchedPrice || 0);
  const numericCompareAtPrice = Number(watchedCompareAtPrice || 0);
  const discountPercent = numericCompareAtPrice > numericPrice && numericPrice > 0
    ? Math.round((1 - numericPrice / numericCompareAtPrice) * 100)
    : 0;
  const variants = variantsQuery.data ?? [];
  const schemaVariant = variants.find(
    (variant) => Object.keys(variant.attributes).length > 0,
  );
  const existingAttributeNames = schemaVariant
    ? Object.keys(schemaVariant.attributes)
    : [];
  const hasLockedAttributeSchema = existingAttributeNames.length > 0;
  const existingValuesByAttribute = Object.fromEntries(
    existingAttributeNames.map((name) => [
      name,
      [
        ...new Set(
          variants
            .map((variant) => variant.attributes[name])
            .filter((value): value is string => Boolean(value)),
        ),
      ],
    ]),
  );
  const matrixCombinations = editingVariant
    ? []
    : createAttributeCombinations(attributes);
  const matrixCombinationCount = editingVariant
    ? 1
    : matrixCombinations.length;

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["seller", "products", productId, "variants"],
    });

  const saveMutation = useMutation<
    SellerVariant | SellerVariant[],
    Error,
    VariantFormValues
  >({
    mutationFn: (values) => {
      const request = toUpdateRequest(values);
      return editingVariant
        ? sellerProductsApi.updateVariant(
            productId,
            editingVariant.id,
            { ...request, attributes: serializeAttributes(attributes) },
          )
        : sellerProductsApi.createVariantsBatch(productId, {
            variants: createAttributeCombinations(attributes).map(
              (combination) => ({
                attributes: combination,
                price: values.price.trim(),
                compareAtPrice: optionalString(values.compareAtPrice),
                weightGram: optionalString(values.weightGram)
                  ? Number(values.weightGram)
                  : undefined,
                variantStatus: values.variantStatus,
                quantityOnHand: Number(values.quantityOnHand),
              }),
            ),
          });
    },
    onSuccess: async (result) => {
      await invalidate();
      pushToast({
        tone: "success",
        title: editingVariant ? "Đã lưu phân loại" : "Đã tạo ma trận phân loại",
        description: Array.isArray(result)
          ? `${result.length} phân loại đã được tạo`
          : result.sku,
      });
      setEditingVariant(null);
      setIsCreateOpen(false);
      form.reset(defaultValues);
    },
  });

  const submitVariant = (values: VariantFormValues) => {
    const names = attributes.map(({ name }) =>
      name.trim().toLocaleLowerCase("vi"),
    );
    if (attributes.length < 1 || attributes.length > 2) {
      setAttributeError("Mỗi sản phẩm chỉ được có 1 hoặc 2 cấp phân loại.");
      return;
    }
    if (attributes.some(({ name, value }) => !name.trim() || !value.trim())) {
      setAttributeError("Vui lòng nhập đầy đủ tên và giá trị phân loại.");
      return;
    }
    if (new Set(names).size !== names.length) {
      setAttributeError("Tên các cấp phân loại không được trùng nhau.");
      return;
    }
    if (!editingVariant) {
      const hasDuplicateValue = attributes.some(({ value }) => {
        const values = splitAttributeValues(value).map((item) =>
          item.toLocaleLowerCase("vi"),
        );
        return new Set(values).size !== values.length;
      });
      if (hasDuplicateValue) {
        setAttributeError("Giá trị trong cùng một cấp không được trùng nhau.");
        return;
      }
      if (matrixCombinationCount < 1 || matrixCombinationCount > 100) {
        setAttributeError("Mỗi lần phải tạo từ 1 đến 100 tổ hợp phân loại.");
        return;
      }
    }
    setAttributeError(null);
    saveMutation.mutate(values);
  };

  const closeVariantModal = () => {
    saveMutation.reset();
    form.reset(defaultValues);
    setAttributes([emptyAttribute(1)]);
    setAttributeError(null);
    setEditingVariant(null);
    setIsCreateOpen(false);
  };

  const openCreateVariant = () => {
    saveMutation.reset();
    setEditingVariant(null);
    setAttributes(
      hasLockedAttributeSchema
        ? existingAttributeNames.map((name, index) => ({
            id: index + 1,
            name,
            value: "",
          }))
        : [emptyAttribute(1)],
    );
    setAttributeError(null);
    form.reset({
      ...defaultValues,
      price: productQuery.data?.basePrice ?? "",
      compareAtPrice: productQuery.data?.compareAtPrice ?? "",
    });
    setIsCreateOpen(true);
  };

  const openEditVariant = (variant: SellerVariant) => {
    saveMutation.reset();
    setIsCreateOpen(false);
    setEditingVariant(variant);
  };

  const quickSaleMutation = useMutation({
    mutationFn: () => sellerSaleCampaignsApi.create({
      campaignName: `Giảm giá ${productQuery.data?.productName ?? "sản phẩm"} · ${saleTarget?.variantName ?? ""}`,
      startsAt: new Date(saleStartsAt).toISOString(),
      endsAt: new Date(saleEndsAt).toISOString(),
      status: "Scheduled",
      items: [{ productVariantId: saleTarget?.id ?? "", salePrice }],
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["seller", "sale-campaigns"] });
      pushToast({ tone: "success", title: "Đã lên lịch giảm giá", description: saleTarget?.variantName });
      setSaleTarget(null); setSalePrice(""); setSaleStartsAt(""); setSaleEndsAt("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (variantId: string) =>
      sellerProductsApi.deleteVariant(productId, variantId),
    onSuccess: async () => {
      await invalidate();
      pushToast({ tone: "success", title: "Đã ngừng bán phân loại" });
      setDeleteTarget(null);
    },
  });

  useEffect(() => {
    if (editingVariant) {
      form.reset(toFormValues(editingVariant));
      setAttributes(parseAttributes(editingVariant));
    }
  }, [editingVariant, form]);

  const isModalOpen = isCreateOpen || Boolean(editingVariant);

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
              Sản phẩm của gian hàng
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Phân loại sản phẩm</h1>
          </div>
          <Button type="button" onClick={openCreateVariant}>
            <Plus size={16} aria-hidden="true" />
            {hasLockedAttributeSchema
              ? "Thêm giá trị phân loại"
              : "Thiết lập phân loại"}
          </Button>
        </div>
      </section>

      <Alert tone="info">
        Mỗi sản phẩm có tối đa 2 cấp phân loại. Sau khi tạo SKU đầu tiên,
        tên cấp được khóa để mọi SKU luôn cùng cấu trúc.
      </Alert>

      <ManagementSearch scope="variant" value={search} onChange={setSearch} placeholder="Tìm theo SKU, tên phân loại hoặc trạng thái sale" resultCount={filteredVariants.length} />

      {variantsQuery.isLoading ? <Skeleton className="h-80 w-full" /> : null}
      {variantsQuery.isError ? (
        <ErrorState
          title="Không thể tải phân loại"
          message="Hệ thống đang tạm thời gián đoạn. Vui lòng thử lại."
        />
      ) : null}
      {!variantsQuery.isLoading && !variantsQuery.isError ? (
        filteredVariants.length > 0 ? (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>SKU</TableHeaderCell>
                <TableHeaderCell>Tên phân loại</TableHeaderCell>
                <TableHeaderCell>Trạng thái</TableHeaderCell>
                <TableHeaderCell>Giá / lịch sale</TableHeaderCell>
                <TableHeaderCell>Còn hàng</TableHeaderCell>
                <TableHeaderCell className="text-right">
                  Thao tác
                </TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredVariants.map((variant) => (
                <TableRow key={variant.id}>
                  <TableCell className="font-medium">{variant.sku}</TableCell>
                  <TableCell>{variant.variantName}</TableCell>
                  <TableCell>
                    <Badge>{formatStatus(variant.variantStatus)}</Badge>
                  </TableCell>
                  <TableCell>
                    <div>{formatMoney(variant.price)}</div>
                    {saleByVariant.get(variant.id) ? (
                      <span className="mt-1 block text-xs font-medium text-primary-700">
                        {saleByVariant.get(variant.id)?.status === "Active" ? "Đang sale" : "Sắp sale"} · đến {new Date(saleByVariant.get(variant.id)!.endsAt).toLocaleString("vi-VN")}
                      </span>
                    ) : <span className="mt-1 block text-xs text-muted">Chưa đặt lịch</span>}
                  </TableCell>
                  <TableCell>{variant.quantityAvailable}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={saleByVariant.has(variant.id)}
                        onClick={() => setSaleTarget(variant)}
                      >
                        <CalendarClock size={15} aria-hidden="true" />
                        {saleByVariant.has(variant.id) ? "Đã có lịch" : "Đặt sale"}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => openEditVariant(variant)}
                      >
                        <Edit size={15} aria-hidden="true" />
                        Chỉnh sửa
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => setDeleteTarget(variant)}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                        Ngừng bán
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            title={search ? "Không tìm thấy phân loại" : "Chưa có phân loại"}
            description={search ? "Hãy thử từ khóa khác hoặc xóa nội dung tìm kiếm." : "Hãy thêm ít nhất một phân loại trước khi thiết lập tồn kho."}
            action={
              <Button type="button" onClick={openCreateVariant}>
                <Layers size={16} aria-hidden="true" />
                Thêm phân loại
              </Button>
            }
          />
        )
      ) : null}

      <Modal
        open={isModalOpen}
        title={
          editingVariant
            ? "Chỉnh sửa tổ hợp"
            : hasLockedAttributeSchema
              ? "Thêm giá trị phân loại"
              : "Thiết lập phân loại"
        }
        onClose={closeVariantModal}
        closeDisabled={saveMutation.isPending}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={saveMutation.isPending}
              onClick={closeVariantModal}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              form="variant-form"
              disabled={
                saveMutation.isPending ||
                (!editingVariant &&
                  (matrixCombinationCount < 1 || matrixCombinationCount > 100))
              }
            >
              {saveMutation.isPending
                ? "Đang lưu..."
                : editingVariant
                  ? "Lưu thay đổi"
                  : `Tạo ${matrixCombinationCount} tổ hợp`}
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
          onSubmit={form.handleSubmit(submitVariant)}
        >
          {editingVariant ? (
            <TextInput label="SKU" value={editingVariant.sku} readOnly />
          ) : (
            <Alert tone="info">SKU sẽ được hệ thống tự động tạo sau khi lưu.</Alert>
          )}
          <Alert tone="info">
            {editingVariant
              ? "Tên phân loại được tự động tạo từ các giá trị thuộc tính."
              : "Nhập nhiều giá trị, cách nhau bằng dấu phẩy. Hệ thống sẽ tạo mọi tổ hợp và SKU tương ứng."}
          </Alert>
          <div>
            <TextInput
              label="Giá bán của phân loại"
              inputMode="decimal"
              error={form.formState.errors.price?.message}
              {...form.register("price")}
            />
            <p className="mt-1 text-xs text-muted">Đây là giá thực tế khách thanh toán cho SKU này.</p>
          </div>
          <div>
            <TextInput
              label="Giá gốc trước giảm (không bắt buộc)"
              inputMode="decimal"
              error={form.formState.errors.compareAtPrice?.message}
              {...form.register("compareAtPrice")}
            />
            <p className="mt-1 text-xs text-muted">Phải lớn hơn hoặc bằng giá bán của phân loại.</p>
          </div>
          {numericPrice > 0 ? (
            <div className="rounded-lg border border-primary-100 bg-primary-50 p-3" aria-live="polite">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Xem trước giá</p>
              <div className="mt-2 flex flex-wrap items-baseline gap-2">
                <strong className="text-xl text-primary-700">{formatMoney(String(numericPrice))}</strong>
                {numericCompareAtPrice > numericPrice ? <span className="text-sm text-muted line-through">{formatMoney(String(numericCompareAtPrice))}</span> : null}
                {discountPercent > 0 ? <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-primary-700">Giảm {discountPercent}%</span> : null}
              </div>
            </div>
          ) : null}
          <TextInput
            label="Khối lượng (gam)"
            inputMode="numeric"
            error={form.formState.errors.weightGram?.message}
            {...form.register("weightGram")}
          />
          {!editingVariant ? (
            <div>
              <TextInput
                label="Tồn kho ban đầu"
                inputMode="numeric"
                error={form.formState.errors.quantityOnHand?.message}
                {...form.register("quantityOnHand")}
              />
              <p className="mt-1 text-xs text-muted">
                Số lượng này được áp dụng riêng cho từng tổ hợp vừa tạo.
              </p>
            </div>
          ) : null}
          <SelectInput
            label="Trạng thái"
            error={form.formState.errors.variantStatus?.message}
            {...form.register("variantStatus")}
          >
            <option value="Active">Đang hoạt động</option>
            <option value="Inactive">Ngừng hoạt động</option>
          </SelectInput>
          <fieldset className="space-y-4 rounded-xl border border-border bg-surface p-4 sm:p-5">
            <legend className="px-2 text-base font-semibold text-ink">
              Cấu trúc phân loại
            </legend>
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-ink">
                  {hasLockedAttributeSchema || editingVariant
                    ? "Tên cấp đã được khóa"
                    : "Chọn tối đa 2 cấp"}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {hasLockedAttributeSchema || editingVariant
                    ? "Bạn chỉ có thể thêm hoặc sửa giá trị; tên cấp phải giống nhau trên mọi SKU."
                    : "Ví dụ: cấp 1 là Màu sắc, cấp 2 là Kích cỡ."}
                </p>
              </div>
              {hasLockedAttributeSchema || editingVariant ? (
                <span className="inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-border px-3 text-xs font-semibold text-muted sm:self-center">
                  <LockKeyhole size={15} aria-hidden="true" />
                  Đã khóa
                </span>
              ) : null}
            </div>

            {attributes.map((attribute, index) => {
              const isNameLocked = Boolean(editingVariant) || hasLockedAttributeSchema;
              const existingValues =
                existingValuesByAttribute[attribute.name] ?? [];
              return (
                <section
                  key={attribute.id}
                  className="rounded-xl border border-border bg-white p-4 shadow-sm"
                  aria-labelledby={`attribute-level-${attribute.id}`}
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p
                        id={`attribute-level-${attribute.id}`}
                        className="text-sm font-semibold text-primary-700"
                      >
                        Phân loại cấp {index + 1}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {index === 0 ? "Khách chọn cấp này trước." : "Khách chọn sau cấp 1."}
                      </p>
                    </div>
                    {!editingVariant &&
                    !hasLockedAttributeSchema &&
                    attributes.length > 1 ? (
                      <Button
                        type="button"
                        variant="secondary"
                        aria-label={`Xóa phân loại cấp ${index + 1}`}
                        onClick={() =>
                          setAttributes((current) =>
                            current.filter((item) => item.id !== attribute.id),
                          )
                        }
                      >
                        <Trash2 size={16} aria-hidden="true" />
                        Xóa cấp
                      </Button>
                    ) : null}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <TextInput
                        id={`attribute-name-${attribute.id}`}
                        label={`Tên cấp ${index + 1}`}
                        placeholder={index === 0 ? "Màu sắc" : "Kích cỡ"}
                        value={attribute.name}
                        readOnly={isNameLocked}
                        aria-invalid={Boolean(attributeError)}
                        aria-describedby={
                          attributeError ? "variant-attribute-error" : undefined
                        }
                        className={isNameLocked ? "bg-surface text-muted" : ""}
                        onChange={(event) => {
                          setAttributeError(null);
                          setAttributes((current) =>
                            current.map((item) =>
                              item.id === attribute.id
                                ? { ...item, name: event.target.value }
                                : item,
                            ),
                          );
                        }}
                      />
                      <p className="mt-1 text-xs text-muted">
                        {isNameLocked
                          ? "Tên cấp không thể đổi sau khi đã tạo SKU."
                          : "Dùng tên ngắn, dễ hiểu với khách hàng."}
                      </p>
                    </div>
                    <div>
                      <TextInput
                        id={`attribute-values-${attribute.id}`}
                        label={editingVariant ? "Giá trị" : "Giá trị mới"}
                        placeholder={
                          editingVariant
                            ? index === 0
                              ? "Đen"
                              : "XL"
                            : index === 0
                              ? "Đen, Đỏ"
                              : "XS, XL, XXL"
                        }
                        value={attribute.value}
                        aria-invalid={Boolean(attributeError)}
                        aria-describedby={
                          attributeError ? "variant-attribute-error" : undefined
                        }
                        onChange={(event) => {
                          setAttributeError(null);
                          setAttributes((current) =>
                            current.map((item) =>
                              item.id === attribute.id
                                ? { ...item, value: event.target.value }
                                : item,
                            ),
                          );
                        }}
                      />
                      <p className="mt-1 text-xs leading-5 text-muted">
                        {editingVariant
                          ? "Nhập một giá trị cho tổ hợp này."
                          : "Nhập nhiều giá trị, cách nhau bằng dấu phẩy."}
                      </p>
                      {!editingVariant && existingValues.length > 0 ? (
                        <p className="mt-1 text-xs text-muted">
                          Đã có: {existingValues.join(", ")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </section>
              );
            })}

            {attributeError ? (
              <div id="variant-attribute-error" role="alert">
                <Alert tone="danger">{attributeError}</Alert>
              </div>
            ) : null}

            {!editingVariant && matrixCombinationCount > 0 ? (
              <div
                className="rounded-xl border border-primary-100 bg-primary-50 p-4"
                aria-live="polite"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-primary-700">
                    Xem trước ma trận
                  </p>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary-700">
                    {matrixCombinationCount} tổ hợp
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {matrixCombinations.slice(0, 8).map((combination) => (
                    <span
                      key={JSON.stringify(combination)}
                      className="rounded-full border border-primary-100 bg-white px-3 py-1 text-xs text-ink"
                    >
                      {Object.values(combination).join(" / ")}
                    </span>
                  ))}
                  {matrixCombinationCount > 8 ? (
                    <span className="px-2 py-1 text-xs font-medium text-muted">
                      +{matrixCombinationCount - 8} tổ hợp khác
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}

            {!editingVariant &&
            !hasLockedAttributeSchema &&
            attributes.length < 2 ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setAttributes((current) => [
                    ...current,
                    emptyAttribute(
                      Math.max(...current.map(({ id }) => id)) + 1,
                    ),
                  ])
                }
              >
                <Plus size={16} aria-hidden="true" />
                Thêm phân loại cấp 2
              </Button>
            ) : null}
          </fieldset>
        </form>
      </Modal>

      <Modal
        open={Boolean(saleTarget)}
        title="Đặt lịch giảm giá"
        onClose={() => setSaleTarget(null)}
        footer={<>
          <Button type="button" variant="secondary" onClick={() => setSaleTarget(null)}>Hủy</Button>
          <Button
            type="button"
            disabled={quickSaleMutation.isPending || !salePrice || !saleStartsAt || !saleEndsAt}
            onClick={() => quickSaleMutation.mutate()}
          >
            {quickSaleMutation.isPending ? "Đang lên lịch..." : "Lên lịch"}
          </Button>
        </>}
      >
        {quickSaleMutation.isError ? <Alert tone="danger" className="mb-4">{getErrorMessage(quickSaleMutation.error)}</Alert> : null}
        <div className="space-y-4">
          <div className="rounded-lg bg-surface p-4">
            <p className="font-medium">{saleTarget?.variantName}</p>
            <p className="mt-1 text-sm text-muted">SKU {saleTarget?.sku} · Giá thường {formatMoney(saleTarget?.price ?? "0")}</p>
          </div>
          <TextInput label="Giá sale" inputMode="decimal" value={salePrice} onChange={(event) => setSalePrice(event.target.value)} />
          {saleTarget && Number(salePrice) > 0 && Number(salePrice) < Number(saleTarget.price) ? (
            <div className="rounded-lg border border-primary-100 bg-primary-50 p-3" aria-live="polite">
              <strong className="text-xl text-primary-700">{formatMoney(salePrice)}</strong>
              <span className="ml-2 text-sm text-muted line-through">{formatMoney(saleTarget.price)}</span>
              <span className="ml-2 text-xs font-semibold text-primary-700">Giảm {Math.round((1 - Number(salePrice) / Number(saleTarget.price)) * 100)}%</span>
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Bắt đầu" type="datetime-local" value={saleStartsAt} onChange={(event) => setSaleStartsAt(event.target.value)} />
            <TextInput label="Kết thúc" type="datetime-local" value={saleEndsAt} onChange={(event) => setSaleEndsAt(event.target.value)} />
          </div>
          <p className="text-xs text-muted">Giá sale tự có hiệu lực lúc bắt đầu và tự kết thúc đúng thời gian đã đặt.</p>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        title="Ngừng bán phân loại"
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
              {deleteMutation.isPending ? "Đang ngừng bán..." : "Ngừng bán"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          {deleteMutation.isError
            ? getErrorMessage(deleteMutation.error)
            : `Phân loại ${deleteTarget?.sku ?? "này"} sẽ ngừng bán và không còn khả dụng cho đơn hàng mới.`}
        </p>
      </Modal>
    </div>
  );
}

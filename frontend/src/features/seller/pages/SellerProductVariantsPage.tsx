import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Edit, Layers, Plus, Trash2, X } from "lucide-react";
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
import type { SellerVariant, VariantCreateRequest, VariantUpdateRequest } from "../types";

const moneyPattern = /^(0|[1-9]\d{0,15})(\.\d{1,2})?$/;
const integerPattern = /^\d*$/;

const variantSchema = z.object({
  variantName: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập tên phân loại")
    .max(255, "Tên phân loại quá dài"),
  variantOptionJson: z
    .string()
    .trim()
    .max(4000, "Dữ liệu tùy chọn quá dài")
    .optional(),
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
    .optional(),
  quantityOnHand: z
    .string()
    .regex(/^\d+$/, "Tồn kho ban đầu phải là số nguyên không âm"),
  variantStatus: z.enum(["Active", "Inactive"]),
});

type VariantFormValues = z.infer<typeof variantSchema>;

const defaultValues: VariantFormValues = {
  variantName: "",
  variantOptionJson: "",
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
  variantName: variant.variantName,
  variantOptionJson: variant.variantOptionJson ?? "",
  price: variant.price,
  compareAtPrice: variant.compareAtPrice ?? "",
  weightGram: String(variant.weightGram ?? ""),
  quantityOnHand: String(variant.quantityAvailable),
  variantStatus: variant.variantStatus === "Inactive" ? "Inactive" : "Active",
});

type AttributeRow = { id: number; name: string; value: string };
const emptyAttribute = (id: number): AttributeRow => ({ id, name: "", value: "" });
const parseAttributes = (json: string | null | undefined): AttributeRow[] => {
  if (!json) return [emptyAttribute(1)];
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const entries = Object.entries(parsed).filter(([, value]) => typeof value === "string");
    return entries.length > 0
      ? entries.map(([name, value], index) => ({ id: index + 1, name, value: String(value) }))
      : [emptyAttribute(1)];
  } catch {
    return [emptyAttribute(1)];
  }
};
const serializeAttributes = (attributes: AttributeRow[]) => {
  const entries = attributes
    .map(({ name, value }) => [name.trim(), value.trim()] as const)
    .filter(([name, value]) => name && value);
  return entries.length > 0 ? JSON.stringify(Object.fromEntries(entries)) : undefined;
};

export function SellerProductVariantsPage() {
  const { id } = useParams<{ id: string }>();
  const [editingVariant, setEditingVariant] = useState<SellerVariant | null>(
    null,
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SellerVariant | null>(null);
  const [attributes, setAttributes] = useState<AttributeRow[]>([emptyAttribute(1)]);
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
    queryKey: ["seller", "products", "variant-price-default", productId],
    queryFn: () => sellerProductsApi.list(1, 100),
    enabled: Boolean(productId),
    select: (data) => data.items.find((product) => product.id === productId),
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

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["seller", "products", productId, "variants"],
    });

  const saveMutation = useMutation({
    mutationFn: (values: VariantFormValues) => {
      const request = {
        ...toUpdateRequest(values),
        variantOptionJson: serializeAttributes(attributes),
      };
      return editingVariant
        ? sellerProductsApi.updateVariant(
            productId,
            editingVariant.id,
            request,
          )
        : sellerProductsApi.createVariant(productId, {
            ...request,
            quantityOnHand: Number(values.quantityOnHand),
          } as VariantCreateRequest);
    },
    onSuccess: async (variant) => {
      await invalidate();
      pushToast({
        tone: "success",
        title: "Đã lưu phân loại",
        description: variant.sku,
      });
      setEditingVariant(null);
      setIsCreateOpen(false);
      form.reset(defaultValues);
    },
  });

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
      pushToast({ tone: "success", title: "Đã xóa phân loại" });
      setDeleteTarget(null);
    },
  });

  useEffect(() => {
    if (editingVariant) {
      form.reset(toFormValues(editingVariant));
      setAttributes(parseAttributes(editingVariant.variantOptionJson));
    } else if (isCreateOpen) {
      form.reset({
        ...defaultValues,
        price: productQuery.data?.basePrice ?? "",
        compareAtPrice: productQuery.data?.compareAtPrice ?? "",
      });
      setAttributes([emptyAttribute(1)]);
    }
  }, [editingVariant, form, isCreateOpen, productQuery.data]);

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
          <Button type="button" onClick={() => setIsCreateOpen(true)}>
            <Plus size={16} aria-hidden="true" />
            Thêm phân loại
          </Button>
        </div>
      </section>

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
                    <div className="flex justify-end gap-2">
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
                        onClick={() => setEditingVariant(variant)}
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
                        Xóa
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
              <Button type="button" onClick={() => setIsCreateOpen(true)}>
                <Layers size={16} aria-hidden="true" />
                Thêm phân loại
              </Button>
            }
          />
        )
      ) : null}

      <Modal
        open={isModalOpen}
        title={editingVariant ? "Chỉnh sửa phân loại" : "Tạo phân loại"}
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
              Hủy
            </Button>
            <Button
              type="submit"
              form="variant-form"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
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
          {editingVariant ? (
            <TextInput label="SKU" value={editingVariant.sku} readOnly />
          ) : (
            <Alert tone="info">SKU sẽ được hệ thống tự động tạo sau khi lưu.</Alert>
          )}
          <TextInput
            label="Tên phân loại"
            error={form.formState.errors.variantName?.message}
            {...form.register("variantName")}
          />
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
              <p className="mt-1 text-xs text-muted">Sản phẩm chỉ hiển thị để bán khi phân loại đang hoạt động và tồn kho lớn hơn 0.</p>
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
          <fieldset className="space-y-3 rounded-lg border border-border p-3">
            <legend className="px-1 text-sm font-medium text-ink">Thuộc tính phân loại</legend>
            <p className="text-xs text-muted">Ví dụ: Kích thước – 20 cm, hoặc Màu sắc – Đen.</p>
            {attributes.map((attribute, index) => (
              <div key={attribute.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_44px] sm:items-end">
                <TextInput
                  id={`attribute-name-${attribute.id}`}
                  label={index === 0 ? "Tên thuộc tính" : "Tên thuộc tính khác"}
                  value={attribute.name}
                  maxLength={100}
                  placeholder="Ví dụ: Kích thước"
                  onChange={(event) => setAttributes((current) => current.map((item) => item.id === attribute.id ? { ...item, name: event.target.value } : item))}
                />
                <TextInput
                  id={`attribute-value-${attribute.id}`}
                  label={index === 0 ? "Giá trị" : "Giá trị khác"}
                  value={attribute.value}
                  maxLength={255}
                  placeholder="Ví dụ: 20 cm"
                  onChange={(event) => setAttributes((current) => current.map((item) => item.id === attribute.id ? { ...item, value: event.target.value } : item))}
                />
                <Button
                  type="button"
                  variant="secondary"
                  aria-label={`Xóa thuộc tính ${index + 1}`}
                  disabled={attributes.length === 1}
                  onClick={() => setAttributes((current) => current.filter((item) => item.id !== attribute.id))}
                >
                  <X size={17} aria-hidden="true" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAttributes((current) => [...current, emptyAttribute(Math.max(0, ...current.map((item) => item.id)) + 1)])}
            >
              <Plus size={16} aria-hidden="true" />
              Thêm thuộc tính
            </Button>
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
        title="Xóa phân loại"
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteTarget(null)}
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
            : `Bạn có muốn xóa phân loại ${deleteTarget?.sku ?? ""} không?`}
        </p>
      </Modal>
    </div>
  );
}

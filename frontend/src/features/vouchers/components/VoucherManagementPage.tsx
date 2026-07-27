import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Percent, Plus, Ticket, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
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
import { categoriesApi } from "@/features/catalog/api";
import type { CategoryTreeNode } from "@/features/catalog/types";
import { sellerProductsApi } from "@/features/seller/api";
import { getErrorMessage } from "@/services/errors";
import { apiGet } from "@/services/api";
import { useToastStore } from "@/stores/toast.store";
import { formatDateTime, formatMoney, formatStatus } from "@/utils/format";
import type { Voucher, VoucherListResponse, VoucherRequest } from "../types";

const voucherSchema = z
  .object({
    voucherCode: z
      .string()
      .trim()
      .toUpperCase()
      .min(4, "Mã giảm giá cần ít nhất 4 ký tự")
      .max(20, "Mã giảm giá tối đa 20 ký tự")
      .regex(/^[A-Z0-9]+$/, "Mã chỉ gồm chữ in hoa và số"),
    voucherName: z
      .string()
      .trim()
      .min(2, "Tên mã giảm giá cần ít nhất 2 ký tự")
      .max(150, "Tên mã giảm giá quá dài"),
    discountType: z.enum(["Percentage", "FixedAmount"]),
    discountTarget: z.enum(["Product", "Shipping"]),
    productScope: z.enum(["AllProducts", "Categories", "SpecificProducts"]),
    categoryIds: z.array(z.string()),
    productIds: z.array(z.string()),
    discountValue: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập giá trị giảm giá")
      .regex(/^\d+(\.\d+)?$/, "Giá trị giảm giá không hợp lệ"),
    maxDiscountAmount: z
      .string()
      .trim()
      .regex(/^\d*(\.\d+)?$/, "Giảm tối đa không hợp lệ")
      .optional(),
    minOrderAmount: z
      .string()
      .trim()
      .regex(/^\d*(\.\d+)?$/, "Đơn hàng tối thiểu không hợp lệ")
      .optional(),
    usageLimit: z
      .string()
      .trim()
      .regex(/^\d*$/, "Số lượt sử dụng phải là số nguyên")
      .optional(),
    startAt: z.string().min(1, "Vui lòng chọn thời gian bắt đầu"),
    endAt: z.string().min(1, "Vui lòng chọn thời gian kết thúc"),
  })
  .refine((values) => new Date(values.endAt) > new Date(values.startAt), {
    message: "Thời gian kết thúc phải sau thời gian bắt đầu",
    path: ["endAt"],
  })
  .refine(
    (values) =>
      values.discountType !== "Percentage" ||
      Number(values.discountValue) <= 100,
    {
      message: "Phần trăm giảm giá tối đa là 100",
      path: ["discountValue"],
    },
  )
  .refine(
    (values) => values.discountTarget !== "Shipping" || values.categoryIds.length === 0,
    { message: "Voucher vận chuyển không áp dụng theo danh mục", path: ["categoryIds"] },
  );

type VoucherFormValues = z.infer<typeof voucherSchema>;

function toDatetimeLocal(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultFormValues(): VoucherFormValues {
  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  return {
    voucherCode: "",
    voucherName: "",
    discountType: "Percentage",
    discountTarget: "Product",
    productScope: "AllProducts",
    categoryIds: [],
    productIds: [],
    discountValue: "10",
    maxDiscountAmount: "",
    minOrderAmount: "0",
    usageLimit: "",
    startAt: toDatetimeLocal(now.toISOString()),
    endAt: toDatetimeLocal(nextMonth.toISOString()),
  };
}

function toFormValues(voucher: Voucher): VoucherFormValues {
  return {
    voucherCode: voucher.voucherCode,
    voucherName: voucher.voucherName,
    discountType: voucher.discountType,
    discountTarget: voucher.discountTarget ?? "Product",
    productScope: voucher.productScope ?? "AllProducts",
    categoryIds: (voucher.categories ?? []).map((category) => category.id),
    productIds: (voucher.products ?? []).map((product) => product.id),
    discountValue: voucher.discountValue,
    maxDiscountAmount: voucher.maxDiscountAmount ?? "",
    minOrderAmount: voucher.minOrderAmount,
    usageLimit: voucher.usageLimit !== null ? String(voucher.usageLimit) : "",
    startAt: toDatetimeLocal(voucher.startAt),
    endAt: toDatetimeLocal(voucher.endAt),
  };
}

function toRequest(
  values: VoucherFormValues,
  isEditing: boolean,
): VoucherRequest {
  const request: VoucherRequest = {
    voucherName: values.voucherName.trim(),
    discountType: values.discountType,
    discountTarget: values.discountTarget,
    productScope: values.discountTarget === "Shipping" ? "AllProducts" : values.productScope,
    categoryIds: values.discountTarget === "Product" && values.productScope === "Categories" ? values.categoryIds : [],
    productIds: values.discountTarget === "Product" && values.productScope === "SpecificProducts" ? values.productIds : [],
    discountValue: Number(values.discountValue),
    maxDiscountAmount:
      values.discountType === "Percentage" &&
      values.maxDiscountAmount?.trim()
        ? Number(values.maxDiscountAmount)
        : undefined,
    minOrderAmount: values.minOrderAmount?.trim()
      ? Number(values.minOrderAmount)
      : 0,
    usageLimit: values.usageLimit?.trim()
      ? Number(values.usageLimit)
      : undefined,
    startAt: new Date(values.startAt).toISOString(),
    endAt: new Date(values.endAt).toISOString(),
  };

  if (!isEditing) {
    request.voucherCode = values.voucherCode.trim().toUpperCase();
  }

  return request;
}

type VoucherManagementApi = {
  list: (page: number, limit: number, status?: string) => Promise<VoucherListResponse>;
  create: (body: VoucherRequest) => Promise<Voucher>;
  update: (voucherId: string, body: VoucherRequest) => Promise<Voucher>;
  deactivate: (voucherId: string) => Promise<Voucher>;
};

type VoucherManagementPageProps = {
  queryKeyPrefix: string;
  api: VoucherManagementApi;
  eyebrow: string;
  title: string;
  description: string;
  createLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  showScopeColumn?: boolean;
  owner: "platform" | "shop";
};

const statuses = ["", "Active", "Inactive"] as const;

export function VoucherManagementPage({
  queryKeyPrefix,
  api,
  eyebrow,
  title,
  description,
  createLabel,
  emptyTitle,
  emptyDescription,
  showScopeColumn = false,
  owner,
}: VoucherManagementPageProps) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<(typeof statuses)[number]>("");
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<Voucher | null>(
    null,
  );
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const queryKey = [queryKeyPrefix, page, status];

  const form = useForm<VoucherFormValues>({
    resolver: zodResolver(voucherSchema),
    defaultValues: defaultFormValues(),
  });

  const vouchersQuery = useQuery({
    queryKey,
    queryFn: () => api.list(page, 10, status || undefined),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [queryKeyPrefix] });

  const saveMutation = useMutation({
    mutationFn: (values: VoucherFormValues) =>
      editingVoucher
        ? api.update(editingVoucher.id, toRequest(values, true))
        : api.create(toRequest(values, false)),
    onSuccess: async () => {
      await invalidate();
      pushToast({ tone: "success", title: "Đã lưu mã giảm giá" });
      setEditingVoucher(null);
      setIsCreateOpen(false);
      form.reset(defaultFormValues());
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (voucherId: string) => api.deactivate(voucherId),
    onSuccess: async () => {
      await invalidate();
      pushToast({ tone: "success", title: "Đã ngừng sử dụng mã giảm giá" });
      setDeactivateTarget(null);
    },
  });

  useEffect(() => {
    if (editingVoucher) {
      form.reset(toFormValues(editingVoucher));
    } else if (isCreateOpen) {
      form.reset(defaultFormValues());
    }
  }, [editingVoucher, form, isCreateOpen]);

  const vouchers = vouchersQuery.data?.items ?? [];
  const meta = vouchersQuery.data?.meta;
  const isModalOpen = isCreateOpen || Boolean(editingVoucher);
  const discountType = form.watch("discountType");
  const discountTarget = form.watch("discountTarget");
  const productScope = form.watch("productScope");
  const categoriesQuery = useQuery({
    queryKey: owner === "shop" ? ["seller", "shop-categories", "voucher-form"] : ["categories", "tree", "voucher-form"],
    queryFn: () => owner === "shop"
      ? apiGet<Array<CategoryTreeNode & { productIds: string[] }>>("/seller/shop-categories")
      : categoriesApi.list(),
    enabled: isModalOpen,
  });
  const flattenCategories = (nodes: CategoryTreeNode[]): CategoryTreeNode[] =>
    nodes.flatMap((node) => [node, ...flattenCategories(node.children ?? [])]);
  const categories = owner === "shop" ? (categoriesQuery.data ?? []) : flattenCategories(categoriesQuery.data ?? []);
  const productsQuery = useQuery({ queryKey: ["seller-products", "voucher-form"], queryFn: () => sellerProductsApi.list(1, 100), enabled: isModalOpen && owner === "shop" && productScope === "SpecificProducts" });
  const products = productsQuery.data?.items ?? [];

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-2xl font-semibold">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <SelectInput
              label="Trạng thái"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as (typeof statuses)[number]);
                setPage(1);
              }}
            >
              <option value="">Tất cả</option>
              <option value="Active">Đang hoạt động</option>
              <option value="Inactive">Ngừng hoạt động</option>
            </SelectInput>
            <Button type="button" onClick={() => setIsCreateOpen(true)}>
              <Plus size={16} aria-hidden="true" />
              {createLabel}
            </Button>
          </div>
        </div>
      </section>

      {vouchersQuery.isLoading ? <Skeleton className="h-96 w-full" /> : null}
      {vouchersQuery.isError ? (
        <ErrorState
          title="Không thể tải danh sách mã giảm giá"
          message="Hệ thống đang tạm thời gián đoạn. Vui lòng thử lại."
        />
      ) : null}
      {!vouchersQuery.isLoading && !vouchersQuery.isError ? (
        vouchers.length > 0 ? (
          <div className="space-y-4">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Mã giảm giá</TableHeaderCell>
                  {showScopeColumn ? (
                    <TableHeaderCell>Phạm vi</TableHeaderCell>
                  ) : null}
                  <TableHeaderCell>Giảm giá</TableHeaderCell>
                  <TableHeaderCell>Điều kiện</TableHeaderCell>
                  <TableHeaderCell>Đã dùng</TableHeaderCell>
                  <TableHeaderCell>Hiệu lực</TableHeaderCell>
                  <TableHeaderCell>Trạng thái</TableHeaderCell>
                  <TableHeaderCell className="text-right">
                    Thao tác
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vouchers.map((voucher) => (
                  <TableRow key={voucher.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-50 text-primary-700">
                          <Ticket size={15} aria-hidden="true" />
                        </span>
                        <div>
                          <p className="font-medium text-ink">
                            {voucher.voucherCode}
                          </p>
                          <p className="text-xs text-muted">
                            {voucher.voucherName}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    {showScopeColumn ? (
                      <TableCell>
                        <Badge
                          tone={voucher.scope === "Platform" ? "default" : "success"}
                        >
                          {voucher.scope === "Platform"
                            ? "Toàn hệ thống"
                            : "Gian hàng"}
                        </Badge>
                      </TableCell>
                    ) : null}
                    <TableCell>
                      <p className="flex items-center gap-1 font-medium text-ink">
                        {voucher.discountType === "Percentage" ? (
                          <>
                            <Percent size={13} aria-hidden="true" />
                            {voucher.discountValue}%
                          </>
                        ) : (
                          formatMoney(voucher.discountValue)
                        )}
                      </p>
                      {voucher.maxDiscountAmount ? (
                        <p className="text-xs text-muted">
                          Tối đa {formatMoney(voucher.maxDiscountAmount)}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-muted">
                        {(voucher.discountTarget ?? "Product") === "Shipping"
                          ? "Giảm phí vận chuyển"
                          : (voucher.categories?.length ?? 0) > 0
                            ? `Danh mục: ${(voucher.categories ?? []).map((category) => category.categoryName).join(", ")}`
                            : "Tất cả sản phẩm"}
                      </p>
                      <p className="text-xs text-muted">
                        Giá trị tối thiểu {formatMoney(voucher.minOrderAmount)}
                      </p>
                    </TableCell>
                    <TableCell>
                      {voucher.usedCount}
                      {voucher.usageLimit !== null
                        ? ` / ${voucher.usageLimit}`
                        : " / Không giới hạn"}
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-muted">
                        {formatDateTime(voucher.startAt)}
                      </p>
                      <p className="text-xs text-muted">
                        đến {formatDateTime(voucher.endAt)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        tone={
                          voucher.voucherStatus === "Active"
                            ? "success"
                            : "default"
                        }
                      >
                        {formatStatus(voucher.voucherStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setEditingVoucher(voucher)}
                        >
                          <Edit size={15} aria-hidden="true" />
                          Chỉnh sửa
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          disabled={voucher.voucherStatus === "Inactive"}
                          onClick={() => setDeactivateTarget(voucher)}
                        >
                          <XCircle size={15} aria-hidden="true" />
                          Ngừng dùng
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination
              page={meta?.page ?? page}
              totalPages={meta?.totalPages ?? 1}
              onPageChange={setPage}
            />
          </div>
        ) : (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        )
      ) : null}

      <Modal
        open={isModalOpen}
        title={editingVoucher ? "Chỉnh sửa mã giảm giá" : "Tạo mã giảm giá"}
        onClose={() => {
          setEditingVoucher(null);
          setIsCreateOpen(false);
        }}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditingVoucher(null);
                setIsCreateOpen(false);
              }}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              form="voucher-form"
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
          id="voucher-form"
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
        >
          <TextInput
            label="Mã giảm giá"
            placeholder="VD: SALE50K"
            disabled={Boolean(editingVoucher)}
            error={form.formState.errors.voucherCode?.message}
            {...form.register("voucherCode")}
          />
          <TextInput
            label="Tên mã giảm giá"
            error={form.formState.errors.voucherName?.message}
            {...form.register("voucherName")}
          />
          <SelectInput
            label="Đối tượng giảm giá"
            error={form.formState.errors.discountTarget?.message}
            {...form.register("discountTarget")}
          >
            <option value="Product">Tiền hàng</option>
            {owner === "platform" ? <option value="Shipping">Phí vận chuyển</option> : null}
          </SelectInput>
          {discountTarget === "Product" ? (
            <div className="space-y-3">
              <SelectInput label="Phạm vi sản phẩm" {...form.register("productScope")}><option value="AllProducts">Tất cả sản phẩm</option><option value="Categories">Theo danh mục</option><option value="SpecificProducts">Sản phẩm cụ thể</option></SelectInput>
            {productScope === "Categories" ? <fieldset className="rounded-lg border border-border p-3">
              <legend className="px-1 text-sm font-medium text-ink">Danh mục áp dụng</legend>
              <p className="mb-2 text-xs text-muted">Không chọn danh mục nghĩa là áp dụng cho tất cả sản phẩm.</p>
              {categoriesQuery.isLoading ? <Skeleton className="h-20 w-full" /> : null}
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {categories.map((category) => (
                  <label key={category.id} className="flex min-h-11 items-center gap-2 rounded px-2 hover:bg-surface">
                    <input
                      type="checkbox"
                      value={category.id}
                      {...form.register("categoryIds")}
                      className="h-5 w-5 accent-primary-600"
                    />
                    <span className="text-sm text-ink">{category.categoryName}</span>
                  </label>
                ))}
              </div>
              {form.formState.errors.categoryIds?.message ? (
                <p className="mt-1 text-xs text-danger">{form.formState.errors.categoryIds.message}</p>
              ) : null}
            </fieldset> : null}
            {productScope === "SpecificProducts" ? <fieldset className="rounded-lg border border-border p-3"><legend className="px-1 text-sm font-medium text-ink">Sản phẩm áp dụng</legend>{productsQuery.isLoading ? <Skeleton className="h-20 w-full" /> : <div className="max-h-48 space-y-1 overflow-y-auto">{products.map((product) => <label key={product.id} className="flex min-h-11 items-center gap-2 rounded px-2 hover:bg-surface"><input type="checkbox" value={product.id} {...form.register("productIds")} className="h-5 w-5 accent-primary-600"/><span className="text-sm text-ink">{product.productName}</span></label>)}</div>}</fieldset> : null}
            </div>
          ) : (
            <Alert tone="info">Mức giảm được tính trực tiếp trên tổng phí vận chuyển đã báo giá.</Alert>
          )}
          <SelectInput
            label="Cách tính giảm giá"
            error={form.formState.errors.discountType?.message}
            {...form.register("discountType")}
          >
            <option value="Percentage">Theo phần trăm (%)</option>
            <option value="FixedAmount">Số tiền cố định</option>
          </SelectInput>
          <TextInput
            label={
              discountType === "Percentage"
                ? "Phần trăm giảm (%)"
                : "Số tiền giảm (VNĐ)"
            }
            inputMode="decimal"
            error={form.formState.errors.discountValue?.message}
            {...form.register("discountValue")}
          />
          {discountType === "Percentage" ? (
            <TextInput
              label="Giảm tối đa (VNĐ, để trống nếu không giới hạn)"
              inputMode="decimal"
              error={form.formState.errors.maxDiscountAmount?.message}
              {...form.register("maxDiscountAmount")}
            />
          ) : null}
          <TextInput
            label="Giá trị đơn hàng tối thiểu (VNĐ)"
            inputMode="decimal"
            error={form.formState.errors.minOrderAmount?.message}
            {...form.register("minOrderAmount")}
          />
          <TextInput
            label="Giới hạn lượt sử dụng (để trống nếu không giới hạn)"
            inputMode="numeric"
            error={form.formState.errors.usageLimit?.message}
            {...form.register("usageLimit")}
          />
          <TextInput
            label="Thời gian bắt đầu"
            type="datetime-local"
            error={form.formState.errors.startAt?.message}
            {...form.register("startAt")}
          />
          <TextInput
            label="Thời gian kết thúc"
            type="datetime-local"
            error={form.formState.errors.endAt?.message}
            {...form.register("endAt")}
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(deactivateTarget)}
        title="Ngừng sử dụng mã giảm giá"
        onClose={() => setDeactivateTarget(null)}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeactivateTarget(null)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={deactivateMutation.isPending}
              onClick={() =>
                deactivateTarget &&
                deactivateMutation.mutate(deactivateTarget.id)
              }
            >
              {deactivateMutation.isPending ? "Đang xử lý..." : "Ngừng dùng"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          {deactivateMutation.isError
            ? getErrorMessage(deactivateMutation.error)
            : `Bạn có muốn ngừng sử dụng mã ${deactivateTarget?.voucherCode ?? "này"} không? Khách hàng sẽ không thể áp dụng mã này nữa.`}
        </p>
      </Modal>
    </div>
  );
}

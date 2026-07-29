import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PackagePlus, Warehouse } from "lucide-react";
import { useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import { z } from "zod";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { useState } from "react";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/Table";
import { TextInput } from "@/components/ui/TextInput";
import { getErrorMessage } from "@/services/errors";
import { useToastStore } from "@/stores/toast.store";
import { formatDateTime } from "@/utils/format";
import { sellerProductsApi } from "../api";
import type { InventoryAffectedBucket, SellerVariant } from "../types";

const transactionLabels: Record<string, string> = {
  RECEIVE_STOCK: "Nhập thêm hàng",
  MARK_DAMAGED: "Ghi nhận hàng hỏng",
  DISPOSE_DAMAGED: "Xuất hủy hàng hỏng",
  SELLER_SET_STOCK: "Điều chỉnh tồn kho",
};

const bucketLabels: Record<InventoryAffectedBucket, string> = {
  AVAILABLE: "Có thể bán",
  ON_HAND: "Tổng tồn",
  RESERVED: "Đang giữ",
  UNKNOWN: "Số lượng",
};

function InventoryHistory({ productId, variantId }: { productId: string; variantId: string }) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["seller", "products", productId, "inventory", variantId, "transactions", page],
    queryFn: () => sellerProductsApi.listInventoryTransactions(productId, variantId, page, 10),
  });
  const items = query.data?.items ?? [];

  return (
    <details className="mt-5 rounded-md border border-border bg-white">
      <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-4 py-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600">
        <span>Lịch sử tồn kho</span>
        <span className="text-sm font-normal text-muted">Xem biến động</span>
      </summary>
      <div className="border-t border-border p-4" aria-live="polite">
        {query.isLoading ? <Skeleton className="h-28 w-full" /> : null}
        {query.isError ? (
          <Alert tone="danger">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>Không thể tải lịch sử tồn kho.</span>
              <Button type="button" variant="secondary" onClick={() => void query.refetch()}>Thử lại</Button>
            </div>
          </Alert>
        ) : null}
        {!query.isLoading && !query.isError && items.length === 0 ? (
          <p className="text-sm text-muted">Chưa có biến động tồn kho.</p>
        ) : null}
        {items.length > 0 ? (
          <div className="space-y-3">
            <Table>
              <TableHead><TableRow>
                <TableHeaderCell>Thời gian</TableHeaderCell><TableHeaderCell>Thao tác</TableHeaderCell>
                <TableHeaderCell>Thay đổi</TableHeaderCell><TableHeaderCell>Số lượng sau</TableHeaderCell>
                <TableHeaderCell>Lý do / ghi chú</TableHeaderCell><TableHeaderCell>Người thực hiện</TableHeaderCell>
              </TableRow></TableHead>
              <TableBody>{items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                  <TableCell>{transactionLabels[item.transactionType] ?? item.transactionType}</TableCell>
                  <TableCell><span className="font-semibold">{item.quantityChange > 0 ? "+" : ""}{item.quantityChange}</span></TableCell>
                  <TableCell>{bucketLabels[item.affectedBucket]}: {item.quantityAfter}</TableCell>
                  <TableCell>{item.note ?? "—"}</TableCell>
                  <TableCell>{item.createdBy?.email ?? "Hệ thống"}</TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
            <Pagination page={query.data?.meta?.page ?? page} totalPages={query.data?.meta?.totalPages ?? 1} onPageChange={setPage} />
          </div>
        ) : null}
      </div>
    </details>
  );
}

const damagedSchema = z.object({
  quantity: z.coerce.number().int("Số lượng phải là số nguyên").min(1, "Số lượng phải lớn hơn 0").max(100000000, "Số lượng vượt giới hạn"),
  reason: z.string().trim().min(3, "Hãy nhập lý do ít nhất 3 ký tự").max(500, "Lý do không được vượt quá 500 ký tự"),
});

type DamagedFormInput = z.input<typeof damagedSchema>;
type DamagedFormValues = z.output<typeof damagedSchema>;

function DamagedActionForm({
  productId,
  variantId,
  action,
  disabled,
}: {
  productId: string;
  variantId: string;
  action: "mark" | "dispose";
  disabled: boolean;
}) {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const form = useForm<DamagedFormInput, unknown, DamagedFormValues>({
    resolver: zodResolver(damagedSchema),
    defaultValues: { quantity: 1, reason: "" },
  });
  const mutation = useMutation({
    mutationFn: (values: DamagedFormValues) =>
      action === "mark"
        ? sellerProductsApi.markDamaged(productId, variantId, values)
        : sellerProductsApi.disposeDamaged(productId, variantId, values),
    onSuccess: async () => {
      form.reset({ quantity: 1, reason: "" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["seller", "products", productId, "inventory", variantId] }),
        queryClient.invalidateQueries({ queryKey: ["seller", "products", productId, "inventory", variantId, "transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["seller", "products", productId, "variants"] }),
        queryClient.invalidateQueries({ queryKey: ["seller", "products"] }),
      ]);
      pushToast({ tone: "success", title: action === "mark" ? "Đã ghi nhận hàng hỏng" : "Đã xuất hủy hàng hỏng" });
    },
  });
  const isMark = action === "mark";

  return (
    <form className="rounded-md border border-border p-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <h3 className="font-semibold">{isMark ? "Ghi nhận hàng hỏng" : "Xuất hủy hàng hỏng"}</h3>
      <p className="mt-1 text-sm text-muted">
        {isMark ? "Chuyển hàng có thể bán sang hàng hỏng, không giảm tổng tồn." : "Đưa hàng hỏng ra khỏi kho và giảm tổng tồn hệ thống."}
      </p>
      {mutation.isError ? <Alert tone="danger" className="mt-3">{getErrorMessage(mutation.error)}</Alert> : null}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <TextInput label="Số lượng" type="number" min={1} error={form.formState.errors.quantity?.message} {...form.register("quantity")} />
        <TextInput label="Lý do" error={form.formState.errors.reason?.message} {...form.register("reason")} />
      </div>
      <Button className="mt-3" type="submit" variant={isMark ? "secondary" : "danger"} disabled={disabled || mutation.isPending}>
        {mutation.isPending ? "Đang xử lý..." : isMark ? "Ghi nhận hàng hỏng" : "Xuất hủy"}
      </Button>
    </form>
  );
}

const inventorySchema = z.object({
  quantityReceived: z.coerce
    .number()
    .int("Số lượng nhập phải là số nguyên")
    .min(1, "Số lượng nhập phải lớn hơn 0")
    .max(100000000, "Số lượng nhập vượt giới hạn"),
});

type InventoryFormInput = z.input<typeof inventorySchema>;
type InventoryFormValues = z.output<typeof inventorySchema>;

function InventoryEditor({ productId, variant }: { productId: string; variant: SellerVariant }) {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const form = useForm<InventoryFormInput, unknown, InventoryFormValues>({
    resolver: zodResolver(inventorySchema),
    defaultValues: { quantityReceived: 1 },
  });
  const inventoryQuery = useQuery({
    queryKey: ["seller", "products", productId, "inventory", variant.id],
    queryFn: () => sellerProductsApi.getInventory(productId, variant.id),
  });
  const mutation = useMutation({
    mutationFn: (values: InventoryFormValues) =>
      sellerProductsApi.setInventory(productId, variant.id, values),
    onSuccess: async () => {
      form.reset({ quantityReceived: 1 });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["seller", "products", productId, "inventory", variant.id] }),
        queryClient.invalidateQueries({ queryKey: ["seller", "products", productId, "inventory", variant.id, "transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["seller", "products", productId, "variants"] }),
        queryClient.invalidateQueries({ queryKey: ["seller", "products"] }),
      ]);
      pushToast({ tone: "success", title: "Đã nhập thêm hàng" });
    },
  });
  const inventory = inventoryQuery.data;

  return (
    <article className="rounded-lg border border-border bg-white p-5 shadow-panel">
      <div>
        <h2 className="text-lg font-semibold">{variant.sku}</h2>
        <p className="text-sm text-muted">{variant.variantName}</p>
      </div>

      {inventoryQuery.isLoading ? <Skeleton className="mt-4 h-28 w-full" /> : null}
      {inventoryQuery.isError ? (
        <Alert tone="danger" className="mt-4">{getErrorMessage(inventoryQuery.error)}</Alert>
      ) : null}
      {mutation.isError ? (
        <Alert tone="danger" className="mt-4">{getErrorMessage(mutation.error)}</Alert>
      ) : null}

      {!inventoryQuery.isLoading && !inventoryQuery.isError ? (
        <>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md border border-border p-3">
              <dt className="text-xs text-muted">Có thể bán</dt>
              <dd className="mt-1 text-xl font-semibold">{inventory?.quantityAvailable ?? 0}</dd>
            </div>
            {(inventory?.quantityReserved ?? 0) > 0 ? (
              <div className="rounded-md border border-border p-3">
                <dt className="text-xs text-muted">Đang giữ cho đơn</dt>
                <dd className="mt-1 text-xl font-semibold">{inventory?.quantityReserved}</dd>
              </div>
            ) : null}
            {(inventory?.quantityDamaged ?? 0) > 0 ? (
              <div className="rounded-md border border-border p-3">
                <dt className="text-xs text-muted">Hàng hỏng</dt>
                <dd className="mt-1 text-xl font-semibold">{inventory?.quantityDamaged}</dd>
              </div>
            ) : null}
            <div className="rounded-md border border-border p-3">
              <dt className="text-xs text-muted">Tổng tồn hệ thống</dt>
              <dd className="mt-1 text-xl font-semibold">{inventory?.quantityOnHand ?? 0}</dd>
            </div>
          </dl>

          <form
            className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end"
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          >
            <div className="w-full sm:max-w-xs">
              <TextInput
                label="Số lượng nhập thêm"
                type="number"
                min={1}
                error={form.formState.errors.quantityReceived?.message}
                {...form.register("quantityReceived")}
              />
            </div>
            <Button type="submit" disabled={mutation.isPending}>
              <PackagePlus size={16} aria-hidden="true" />
              {mutation.isPending ? "Đang nhập hàng..." : "Nhập thêm hàng"}
            </Button>
          </form>
          <p className="mt-3 text-sm text-muted">
            Số lượng mới được cộng vào tồn hiện tại, không thay thế hàng đang có và không thay đổi hàng đã giữ cho đơn.
          </p>
          <details className="mt-5 rounded-md border border-border bg-surface-subtle">
            <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-4 py-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600">
              <span>Xử lý hàng hỏng</span>
              <span className="text-sm font-normal text-muted">Đang có {inventory?.quantityDamaged ?? 0} sản phẩm hỏng</span>
            </summary>
            <div className="grid gap-4 border-t border-border p-4 lg:grid-cols-2">
              <DamagedActionForm
                productId={productId}
                variantId={variant.id}
                action="mark"
                disabled={(inventory?.quantityAvailable ?? 0) < 1}
              />

            </div>
          </details>
        </>
      ) : null}

      <p className="mt-3 text-xs text-muted">Cập nhật gần nhất: {formatDateTime(inventory?.updatedAt)}</p>
      <InventoryHistory productId={productId} variantId={variant.id} />
    </article>
  );
}

export function SellerProductInventoryPage() {
  const { id } = useParams<{ id: string }>();
  const productId = id ?? "";
  const variantsQuery = useQuery({
    queryKey: ["seller", "products", productId, "variants"],
    queryFn: () => sellerProductsApi.listVariants(productId),
    enabled: Boolean(productId),
  });
  const variants = variantsQuery.data ?? [];

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Sản phẩm của gian hàng</p>
        <h1 className="mt-2 text-2xl font-semibold">Nhập hàng</h1>
        <p className="mt-2 text-sm text-muted">Nhập thêm lô hàng theo từng phân loại. Tồn kho hiện tại luôn được giữ nguyên và cộng dồn.</p>
      </section>

      {variantsQuery.isLoading ? <Skeleton className="h-80 w-full" /> : null}
      {variantsQuery.isError ? (
        <ErrorState title="Không thể tải phân loại" message="Tồn kho được quản lý riêng theo từng phân loại sản phẩm." />
      ) : null}
      {!variantsQuery.isLoading && !variantsQuery.isError ? (
        variants.length > 0 ? (
          <div className="space-y-4">
            {variants.map((variant) => (
              <InventoryEditor key={variant.id} productId={productId} variant={variant} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Chưa có phân loại"
            description="Hãy tạo phân loại trước khi nhập hàng."
            action={
              <Button type="button" variant="secondary" disabled>
                <Warehouse size={16} aria-hidden="true" />
                Chưa thể nhập hàng
              </Button>
            }
          />
        )
      ) : null}
    </div>
  );
}

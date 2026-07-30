import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CirclePause,
  CirclePlay,
  Edit,
  Images,
  Layers,
  PackageCheck,
  PackagePlus,
  Trash2,
  Warehouse,
} from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { ManagementSearch } from "@/components/data-display/ManagementSearch";
import { ErrorState } from "@/components/common/ErrorState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { getErrorMessage } from "@/services/errors";
import { useToastStore } from "@/stores/toast.store";
import { formatMoney, formatStatus } from "@/utils/format";
import { sellerProductsApi } from "../api";
import type { SellerProduct } from "../types";

export function SellerProductsPage() {
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<SellerProduct | null>(null);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const closeDeleteModal = () => {
    if (deleteMutation.isPending) return;
    deleteMutation.reset();
    setDeleteTarget(null);
  };
  const openDeleteModal = (product: SellerProduct) => {
    deleteMutation.reset();
    setDeleteTarget(product);
  };

  const pushToast = useToastStore((state) => state.pushToast);
  const productsQuery = useQuery({
    queryKey: ["seller", "products", page],
    queryFn: () => sellerProductsApi.list(page, 10),
  });

  const deleteMutation = useMutation({
    mutationFn: (productId: string) => sellerProductsApi.delete(productId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["seller", "products"] });
      pushToast({ tone: "success", title: "Đã xóa sản phẩm" });
      setDeleteTarget(null);
    },
  });

  const lifecycleMutation = useMutation({
    mutationFn: ({ productId, action }: { productId: string; action: "submit" | "stop" | "resume" }) => {
      if (action === "submit") return sellerProductsApi.submit(productId);
      if (action === "stop") return sellerProductsApi.stopSelling(productId);
      return sellerProductsApi.resumeSelling(productId);
    },
    onSuccess: async (product) => {
      await queryClient.invalidateQueries({ queryKey: ["seller", "products"] });
      pushToast({
        tone: "success",
        title: product.productStatus === "PendingApproval"
          ? "Đã gửi phê duyệt"
          : product.productStatus === "Inactive"
            ? "Đã ngừng bán sản phẩm"
            : "Đã mở bán lại sản phẩm",
      });
    },
    onError: (error) => {
      pushToast({ tone: "danger", title: "Không thể cập nhật trạng thái", description: getErrorMessage(error) });
    },
  });

  const products = productsQuery.data?.items ?? [];
  const normalizedSearch = search.trim().toLocaleLowerCase("vi");
  const filteredProducts = products.filter((product) =>
    `${product.productName} ${product.category.categoryName} ${formatStatus(product.productStatus)}`
      .toLocaleLowerCase("vi").includes(normalizedSearch),
  );
  const meta = productsQuery.data?.meta;

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
              Sản phẩm của gian hàng
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Sản phẩm</h1>
            <p className="mt-2 text-sm text-muted">
              Tạo sản phẩm và quản lý phân loại, hình ảnh, tồn kho.
            </p>
          </div>
          <ButtonLink to="/seller/products/create">
            <PackagePlus size={16} aria-hidden="true" />
            Thêm sản phẩm
          </ButtonLink>
        </div>
      </section>

      <ManagementSearch scope="product" value={search} onChange={setSearch} placeholder="Tìm tên sản phẩm, danh mục hoặc trạng thái trong trang này" resultCount={filteredProducts.length} />

      {productsQuery.isLoading ? <Skeleton className="h-96 w-full" /> : null}
      {productsQuery.isError ? (
        <ErrorState
          title="Không thể tải sản phẩm"
          message="Hệ thống đang tạm thời gián đoạn. Vui lòng thử lại."
        />
      ) : null}

      {!productsQuery.isLoading && !productsQuery.isError ? (
        filteredProducts.length > 0 ? (
          <div className="space-y-4">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Sản phẩm</TableHeaderCell>
                  <TableHeaderCell>Trạng thái</TableHeaderCell>
                  <TableHeaderCell>Giá</TableHeaderCell>
                  <TableHeaderCell>Tồn kho</TableHeaderCell>
                  <TableHeaderCell className="text-right">
                    Thao tác
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <p className="font-medium">{product.productName}</p>
                      <p className="text-xs text-muted">
                        {product.category.categoryName}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Badge>{formatStatus(product.productStatus)}</Badge>
                        {product.isViolation ? <Badge>Vi phạm</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell>{formatMoney(product.basePrice)}</TableCell>
                    <TableCell>{product.quantityAvailable}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-2">
                        <ButtonLink
                          to={`/seller/products/${product.id}/edit`}
                          variant="secondary"
                        >
                          <Edit size={15} aria-hidden="true" />
                          Chỉnh sửa
                        </ButtonLink>
                        <ButtonLink
                          to={`/seller/products/${product.id}/variants`}
                          variant="secondary"
                        >
                          <Layers size={15} aria-hidden="true" />
                          Phân loại
                        </ButtonLink>
                        <ButtonLink
                          to={`/seller/products/${product.id}/images`}
                          variant="secondary"
                        >
                          <Images size={15} aria-hidden="true" />
                          Hình ảnh
                        </ButtonLink>
                        <ButtonLink
                          to={`/seller/products/${product.id}/inventory`}
                          variant="secondary"
                        >
                          <Warehouse size={15} aria-hidden="true" />
                          Tồn kho
                        </ButtonLink>
                        {(product.productStatus === "Draft" || product.productStatus === "Rejected") ? (
                          <Button
                            type="button"
                            disabled={lifecycleMutation.isPending}
                            onClick={() => lifecycleMutation.mutate({ productId: product.id, action: "submit" })}
                          >
                            <PackageCheck size={15} aria-hidden="true" />
                            Gửi phê duyệt
                          </Button>
                        ) : null}
                        {product.productStatus === "Published" ? (
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={lifecycleMutation.isPending}
                            onClick={() => lifecycleMutation.mutate({ productId: product.id, action: "stop" })}
                          >
                            <CirclePause size={15} aria-hidden="true" />
                            Ngừng bán
                          </Button>
                        ) : null}
                        {product.productStatus === "Inactive" ? (
                          <Button
                            type="button"
                            disabled={lifecycleMutation.isPending}
                            onClick={() => lifecycleMutation.mutate({ productId: product.id, action: "resume" })}
                          >
                            <CirclePlay size={15} aria-hidden="true" />
                            Mở bán lại
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="danger"
                          onClick={() => openDeleteModal(product)}
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
            <Pagination
              page={meta?.page ?? page}
              totalPages={meta?.totalPages ?? 1}
              onPageChange={setPage}
            />
          </div>
        ) : (
          <EmptyState
            title={search ? "Không tìm thấy sản phẩm" : "Chưa có sản phẩm"}
            description={search ? "Hãy thử từ khóa khác hoặc chuyển sang trang khác." : "Hãy tạo sản phẩm đầu tiên sau khi gian hàng được phê duyệt."}
            action={
              <ButtonLink to="/seller/products/create">
                <PackagePlus size={16} aria-hidden="true" />
                Thêm sản phẩm
              </ButtonLink>
            }
          />
        )
      ) : null}

      <Modal
        open={Boolean(deleteTarget)}
        title="Xóa sản phẩm"
        onClose={closeDeleteModal}
        closeDisabled={deleteMutation.isPending}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={deleteMutation.isPending}
              onClick={closeDeleteModal}
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
            : `Bạn có muốn xóa sản phẩm ${deleteTarget?.productName ?? "này"} không?`}
        </p>
      </Modal>
    </div>
  );
}

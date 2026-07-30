import { useQuery } from "@tanstack/react-query";
import {
  Boxes,
  ClipboardList,
  ExternalLink,
  FolderTree,
  Settings2,
  Store,
} from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Skeleton } from "@/components/ui/Skeleton";
import { resolveMediaUrl } from "@/features/catalog/utils";
import { formatMoney, formatStatus } from "@/utils/format";
import { sellerOrdersApi, sellerProductsApi, sellerShopApi } from "../api";

export function SellerDashboardPage() {
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const shopQuery = useQuery({
    queryKey: ["seller", "shop", "me"],
    queryFn: sellerShopApi.getMyShop,
  });
  const productsQuery = useQuery({
    queryKey: ["seller", "products", 1],
    queryFn: () => sellerProductsApi.list(1, 5),
  });
  const ordersQuery = useQuery({
    queryKey: ["seller", "orders", 1],
    queryFn: () => sellerOrdersApi.list(1, 5),
  });

  if (shopQuery.isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (shopQuery.isError) {
    return (
      <ErrorState
        title="Không thể tải khu vực người bán"
        message="Hệ thống đang tạm thời gián đoạn hoặc tài khoản không có quyền người bán."
      />
    );
  }

  if (!shopQuery.data) {
    return (
      <EmptyState
        title="Đăng ký gian hàng"
        description="Hãy tạo hồ sơ gian hàng trước khi thêm sản phẩm và xử lý đơn hàng."
        action={
          <ButtonLink to="/seller/shop/register">Đăng ký gian hàng</ButtonLink>
        }
      />
    );
  }

  const shop = shopQuery.data;
  const products = productsQuery.data?.items ?? [];
  const orders = ordersQuery.data?.items ?? [];

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-primary-50 text-primary-700">
              {resolveMediaUrl(shop.avatarUrl) && !avatarLoadFailed ? (
                <img
                  src={resolveMediaUrl(shop.avatarUrl) ?? undefined}
                  alt={`Ảnh đại diện ${shop.shopName}`}
                  className="h-full w-full object-cover"
                  onError={() => setAvatarLoadFailed(true)}
                />
              ) : (
                <Store size={28} aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
                Khu vực người bán
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold">{shop.shopName}</h1>
                <Badge>{formatStatus(shop.shopStatus)}</Badge>
              </div>
              <p className="mt-2 max-w-2xl text-sm text-muted">
                {shop.description ??
                  "Quản lý sản phẩm, tồn kho và xử lý đơn hàng."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {shop.shopStatus === "Approved" ? (
              <>
                <ButtonLink to="/seller/shop/profile" variant="secondary">
                  <Settings2 size={16} aria-hidden="true" />
                  Chỉnh thông tin
                </ButtonLink>
                <ButtonLink to={`/shops/${shop.slug}`} variant="secondary">
                  <ExternalLink size={16} aria-hidden="true" />
                  Xem gian hàng
                </ButtonLink>
              </>
            ) : null}
            <ButtonLink to="/seller/shop-operation" variant="secondary">
              <Store size={16} aria-hidden="true" />
              Nhận đơn
            </ButtonLink>
            <ButtonLink to="/seller/shop-categories" variant="secondary">
              <FolderTree size={16} aria-hidden="true" />
              Danh mục
            </ButtonLink>
            <ButtonLink to="/seller/products/create">
              <Boxes size={16} aria-hidden="true" />
              Thêm sản phẩm
            </ButtonLink>
            <ButtonLink to="/seller/orders" variant="secondary">
              <ClipboardList size={16} aria-hidden="true" />
              Đơn hàng
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-white p-5 shadow-panel">
          <Store size={18} className="text-primary-700" aria-hidden="true" />
          <p className="mt-3 text-sm text-muted">Trạng thái gian hàng</p>
          <p className="mt-1 text-xl font-semibold">
            {formatStatus(shop.shopStatus)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-white p-5 shadow-panel">
          <Boxes size={18} className="text-primary-700" aria-hidden="true" />
          <p className="mt-3 text-sm text-muted">Tổng sản phẩm</p>
          <p className="mt-1 text-xl font-semibold">
            {productsQuery.data?.meta?.total ?? products.length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-white p-5 shadow-panel">
          <ClipboardList
            size={18}
            className="text-primary-700"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm text-muted">Đơn hàng của gian hàng</p>
          <p className="mt-1 text-xl font-semibold">
            {ordersQuery.data?.meta?.total ?? orders.length}
          </p>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-white p-5 shadow-panel">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Sản phẩm gần đây</h2>
            <ButtonLink to="/seller/products" variant="secondary">
              Xem tất cả
            </ButtonLink>
          </div>
          <div className="mt-4 space-y-3">
            {products.length > 0 ? (
              products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between gap-4 rounded-md border border-border bg-surface p-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-ink">
                      {product.productName}
                    </p>
                    <p className="text-muted">
                      {formatStatus(product.productStatus)}
                    </p>
                  </div>
                  <p className="font-semibold">
                    {formatMoney(product.basePrice)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">Chưa có sản phẩm.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white p-5 shadow-panel">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Đơn hàng gần đây</h2>
            <ButtonLink to="/seller/orders" variant="secondary">
              Xem tất cả
            </ButtonLink>
          </div>
          <div className="mt-4 space-y-3">
            {orders.length > 0 ? (
              orders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between gap-4 rounded-md border border-border bg-surface p-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-ink">
                      {order.shopOrderCode}
                    </p>
                    <p className="text-muted">
                      {formatStatus(order.orderStatus)}
                    </p>
                  </div>
                  <p className="font-semibold">
                    {formatMoney(order.totalAmount)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">Chưa có đơn hàng.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

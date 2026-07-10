import { useQuery } from '@tanstack/react-query';
import { Boxes, ClipboardList, Store } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatMoney, formatStatus } from '@/utils/format';
import { sellerOrdersApi, sellerProductsApi, sellerShopApi } from '../api';

export function SellerDashboardPage() {
  const shopQuery = useQuery({
    queryKey: ['seller', 'shop', 'me'],
    queryFn: sellerShopApi.getMyShop,
  });
  const productsQuery = useQuery({
    queryKey: ['seller', 'products', 1],
    queryFn: () => sellerProductsApi.list(1, 5),
  });
  const ordersQuery = useQuery({
    queryKey: ['seller', 'orders', 1],
    queryFn: () => sellerOrdersApi.list(1, 5),
  });

  if (shopQuery.isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (shopQuery.isError) {
    return (
      <ErrorState
        title="Cannot load seller workspace"
        message="The seller shop API is unavailable or your session lacks seller access."
      />
    );
  }

  if (!shopQuery.data) {
    return (
      <EmptyState
        title="Register your shop"
        description="Create a shop profile before adding products and processing orders."
        action={<ButtonLink to="/seller/shop/register">Register shop</ButtonLink>}
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
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
              Seller workspace
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">{shop.shopName}</h1>
              <Badge>{formatStatus(shop.shopStatus)}</Badge>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              {shop.description ?? 'Manage products, inventory and fulfillment.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink to="/seller/products/create">
              <Boxes size={16} aria-hidden="true" />
              New product
            </ButtonLink>
            <ButtonLink to="/seller/orders" variant="secondary">
              <ClipboardList size={16} aria-hidden="true" />
              Orders
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-white p-5 shadow-panel">
          <Store size={18} className="text-primary-700" aria-hidden="true" />
          <p className="mt-3 text-sm text-muted">Shop status</p>
          <p className="mt-1 text-xl font-semibold">
            {formatStatus(shop.shopStatus)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-white p-5 shadow-panel">
          <Boxes size={18} className="text-primary-700" aria-hidden="true" />
          <p className="mt-3 text-sm text-muted">Products loaded</p>
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
          <p className="mt-3 text-sm text-muted">Shop orders</p>
          <p className="mt-1 text-xl font-semibold">
            {ordersQuery.data?.meta?.total ?? orders.length}
          </p>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-white p-5 shadow-panel">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Recent products</h2>
            <ButtonLink to="/seller/products" variant="secondary">
              View all
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
                    <p className="font-medium text-ink">{product.productName}</p>
                    <p className="text-muted">{formatStatus(product.productStatus)}</p>
                  </div>
                  <p className="font-semibold">{formatMoney(product.basePrice)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">No products found.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white p-5 shadow-panel">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Recent orders</h2>
            <ButtonLink to="/seller/orders" variant="secondary">
              View all
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
                    <p className="font-medium text-ink">{order.shopOrderCode}</p>
                    <p className="text-muted">{formatStatus(order.orderStatus)}</p>
                  </div>
                  <p className="font-semibold">{formatMoney(order.totalAmount)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">No seller orders found.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

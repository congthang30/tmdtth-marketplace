import { useQuery } from '@tanstack/react-query';
import { Eye, PackageCheck } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Pagination } from '@/components/ui/Pagination';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDateTime, formatMoney, formatStatus } from '@/utils/format';
import { ordersApi } from '../api';

export function OrdersPage() {
  const [page, setPage] = useState(1);
  const ordersQuery = useQuery({
    queryKey: ['orders', 'my', page],
    queryFn: () => ordersApi.listMyOrders(page, 10),
  });

  const orders = ordersQuery.data?.items ?? [];
  const meta = ordersQuery.data?.meta;

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
          Orders
        </p>
        <h1 className="mt-2 text-2xl font-semibold">My orders</h1>
        <p className="mt-2 text-sm text-muted">
          Track customer orders, payment state and shipments.
        </p>
      </section>

      {ordersQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-44 w-full" />
          ))}
        </div>
      ) : null}

      {ordersQuery.isError ? (
        <ErrorState
          title="Cannot load orders"
          message="Your session may have expired or the orders API is unavailable."
        />
      ) : null}

      {!ordersQuery.isLoading && !ordersQuery.isError ? (
        orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <article
                key={order.id}
                className="rounded-lg border border-border bg-white p-5 shadow-panel"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/orders/${order.id}`}
                        className="text-lg font-semibold text-ink hover:text-primary-700"
                      >
                        {order.orderCode}
                      </Link>
                      <Badge>{formatStatus(order.orderStatus)}</Badge>
                      <Badge>{formatStatus(order.paymentStatus)}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted">
                      {formatDateTime(order.createdAt)}
                    </p>
                    <p className="mt-2 text-sm text-muted">
                      {order.receiverName} - {order.receiverPhone}
                    </p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-xl font-semibold text-primary-700">
                      {formatMoney(order.totalAmount)}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {order.shopOrders.length} shop order(s)
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {order.shopOrders.map((shopOrder) => (
                    <div
                      key={shopOrder.id}
                      className="rounded-md border border-border bg-surface p-3 text-sm"
                    >
                      <p className="font-medium text-ink">
                        {shopOrder.shop.shopName}
                      </p>
                      <p className="mt-1 text-muted">
                        {formatStatus(shopOrder.orderStatus)} -{' '}
                        {shopOrder.items.length} item(s)
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <ButtonLink to={`/orders/${order.id}`} variant="secondary">
                    <Eye size={16} aria-hidden="true" />
                    View detail
                  </ButtonLink>
                </div>
              </article>
            ))}
            <Pagination
              page={meta?.page ?? page}
              totalPages={meta?.totalPages ?? 1}
              onPageChange={setPage}
            />
          </div>
        ) : (
          <EmptyState
            title="No orders yet"
            description="Created orders will appear here after checkout."
            action={
              <ButtonLink to="/products">
                <PackageCheck size={16} aria-hidden="true" />
                Browse catalog
              </ButtonLink>
            }
          />
        )
      ) : null}
    </div>
  );
}

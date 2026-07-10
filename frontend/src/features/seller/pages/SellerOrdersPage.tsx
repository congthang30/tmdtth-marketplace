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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/Table';
import { formatDateTime, formatMoney, formatStatus } from '@/utils/format';
import { sellerOrdersApi } from '../api';

export function SellerOrdersPage() {
  const [page, setPage] = useState(1);
  const ordersQuery = useQuery({
    queryKey: ['seller', 'orders', page],
    queryFn: () => sellerOrdersApi.list(page, 10),
  });
  const orders = ordersQuery.data?.items ?? [];
  const meta = ordersQuery.data?.meta;

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
          Seller fulfillment
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Orders</h1>
        <p className="mt-2 text-sm text-muted">
          Confirm, prepare, ship and track shop orders.
        </p>
      </section>

      {ordersQuery.isLoading ? <Skeleton className="h-96 w-full" /> : null}
      {ordersQuery.isError ? (
        <ErrorState
          title="Cannot load seller orders"
          message="The seller orders API is unavailable."
        />
      ) : null}
      {!ordersQuery.isLoading && !ordersQuery.isError ? (
        orders.length > 0 ? (
          <div className="space-y-4">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Order</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Receiver</TableHeaderCell>
                  <TableHeaderCell>Total</TableHeaderCell>
                  <TableHeaderCell>Created</TableHeaderCell>
                  <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link
                        to={`/seller/orders/${order.id}`}
                        className="font-medium text-ink hover:text-primary-700"
                      >
                        {order.shopOrderCode}
                      </Link>
                      <p className="text-xs text-muted">{order.orderCode}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Badge>{formatStatus(order.orderStatus)}</Badge>
                        <Badge>{formatStatus(order.orderPaymentStatus)}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p>{order.receiverName}</p>
                      <p className="text-xs text-muted">{order.receiverPhone}</p>
                    </TableCell>
                    <TableCell>{formatMoney(order.totalAmount)}</TableCell>
                    <TableCell>{formatDateTime(order.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <ButtonLink
                          to={`/seller/orders/${order.id}`}
                          variant="secondary"
                        >
                          <Eye size={15} aria-hidden="true" />
                          Detail
                        </ButtonLink>
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
            title="No seller orders"
            description="Shop orders will appear after customer checkout."
            action={
              <ButtonLink to="/seller/products" variant="secondary">
                <PackageCheck size={16} aria-hidden="true" />
                Products
              </ButtonLink>
            }
          />
        )
      ) : null}
    </div>
  );
}

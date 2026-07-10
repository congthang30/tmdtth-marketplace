import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Banknote,
  CheckCircle2,
  MessageSquarePlus,
  PackageCheck,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { z } from 'zod';
import { ErrorState } from '@/components/common/ErrorState';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Modal } from '@/components/ui/Modal';
import { SelectInput } from '@/components/ui/SelectInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { Textarea } from '@/components/ui/Textarea';
import { reviewsApi } from '@/features/reviews/api';
import { getErrorMessage } from '@/services/errors';
import { useToastStore } from '@/stores/toast.store';
import { formatDateTime, formatMoney, formatStatus } from '@/utils/format';
import { orderPaymentsApi, ordersApi } from '../api';
import type { OrderItem } from '../types';

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  reviewTitle: z.string().trim().max(255).optional(),
  reviewContent: z.string().trim().max(2000).optional(),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;
type ReviewFormInput = z.input<typeof reviewSchema>;

type ReviewModalProps = {
  item: OrderItem | null;
  onClose: () => void;
};

const reviewableStatuses = ['Delivered', 'Completed'];

function ReviewModal({ item, onClose }: ReviewModalProps) {
  const pushToast = useToastStore((state) => state.pushToast);
  const form = useForm<ReviewFormInput, unknown, ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 5,
      reviewTitle: '',
      reviewContent: '',
    },
  });

  const mutation = useMutation({
    mutationFn: reviewsApi.createProductReview,
    onSuccess: () => {
      pushToast({
        tone: 'success',
        title: 'Review submitted',
        description: item?.productNameSnapshot,
      });
      form.reset();
      onClose();
    },
  });

  if (!item) {
    return null;
  }

  return (
    <Modal
      open={Boolean(item)}
      title="Review product"
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="review-form"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Submitting...' : 'Submit review'}
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm font-medium text-ink">
        {item.productNameSnapshot}
      </p>
      {mutation.isError ? (
        <Alert tone="danger" className="mb-4">
          {getErrorMessage(mutation.error)}
        </Alert>
      ) : null}
      <form
        id="review-form"
        className="space-y-4"
        onSubmit={form.handleSubmit((values) =>
          mutation.mutate({
            orderItemId: item.id,
            rating: values.rating,
            reviewTitle: values.reviewTitle?.trim() || undefined,
            reviewContent: values.reviewContent?.trim() || undefined,
          }),
        )}
      >
        <SelectInput
          label="Rating"
          error={form.formState.errors.rating?.message}
          {...form.register('rating')}
        >
          <option value="5">5 stars</option>
          <option value="4">4 stars</option>
          <option value="3">3 stars</option>
          <option value="2">2 stars</option>
          <option value="1">1 star</option>
        </SelectInput>
        <Textarea
          label="Title"
          rows={2}
          maxLength={255}
          error={form.formState.errors.reviewTitle?.message}
          {...form.register('reviewTitle')}
        />
        <Textarea
          label="Review"
          rows={5}
          maxLength={2000}
          error={form.formState.errors.reviewContent?.message}
          {...form.register('reviewContent')}
        />
      </form>
    </Modal>
  );
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [reviewItem, setReviewItem] = useState<OrderItem | null>(null);
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);

  const orderQuery = useQuery({
    queryKey: ['orders', 'detail', id],
    queryFn: () => ordersApi.getMyOrder(id ?? ''),
    enabled: Boolean(id),
  });

  const invalidateOrders = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['orders'] }),
      queryClient.invalidateQueries({ queryKey: ['orders', 'detail', id] }),
    ]);
  };

  const cancelMutation = useMutation({
    mutationFn: () => ordersApi.cancelOrder(id ?? '', cancelReason.trim()),
    onSuccess: async () => {
      await invalidateOrders();
      pushToast({ tone: 'success', title: 'Order cancelled' });
      setIsCancelOpen(false);
      setCancelReason('');
    },
  });

  const fakePaymentMutation = useMutation({
    mutationFn: orderPaymentsApi.markFakeSuccess,
    onSuccess: async () => {
      await invalidateOrders();
      pushToast({ tone: 'success', title: 'Payment marked paid' });
    },
  });

  if (orderQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (orderQuery.isError || !orderQuery.data) {
    return (
      <ErrorState
        title="Cannot load order"
        message="The order was not found or the orders API is unavailable."
      />
    );
  }

  const order = orderQuery.data;
  const canCancel =
    order.orderStatus === 'Created' && order.paymentStatus === 'Pending';
  const pendingFakePayment = order.payments.find(
    (payment) =>
      payment.paymentStatus === 'Pending' &&
      payment.paymentMethod.methodCode === 'FAKE_ONLINE',
  );

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
              Order detail
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">{order.orderCode}</h1>
              <Badge>{formatStatus(order.orderStatus)}</Badge>
              <Badge>{formatStatus(order.paymentStatus)}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted">
              {formatDateTime(order.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {pendingFakePayment ? (
              <Button
                type="button"
                disabled={fakePaymentMutation.isPending}
                onClick={() => fakePaymentMutation.mutate(pendingFakePayment.id)}
              >
                <Banknote size={16} aria-hidden="true" />
                {fakePaymentMutation.isPending ? 'Processing...' : 'Mark paid'}
              </Button>
            ) : null}
            {canCancel ? (
              <Button
                type="button"
                variant="danger"
                onClick={() => setIsCancelOpen(true)}
              >
                <XCircle size={16} aria-hidden="true" />
                Cancel order
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      {fakePaymentMutation.isError ? (
        <Alert tone="danger">
          {getErrorMessage(fakePaymentMutation.error)}
        </Alert>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          {order.shopOrders.map((shopOrder) => {
            const canReviewShop = reviewableStatuses.includes(
              shopOrder.orderStatus,
            );

            return (
              <article
                key={shopOrder.id}
                className="rounded-lg border border-border bg-white p-5 shadow-panel"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-ink">
                      {shopOrder.shop.shopName}
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      {shopOrder.shopOrderCode} -{' '}
                      {formatStatus(shopOrder.orderStatus)}
                    </p>
                  </div>
                  <p className="text-lg font-semibold text-primary-700">
                    {formatMoney(shopOrder.totalAmount)}
                  </p>
                </div>

                <div className="mt-4 divide-y divide-border">
                  {shopOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium text-ink">
                          {item.productNameSnapshot}
                        </p>
                        <p className="mt-1 text-sm text-muted">
                          {item.variantNameSnapshot ?? 'Default'} x{' '}
                          {item.quantity}
                        </p>
                        <p className="mt-1 text-sm text-muted">
                          {formatMoney(item.unitPrice)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <p className="min-w-24 text-sm font-semibold text-ink">
                          {formatMoney(item.lineTotal)}
                        </p>
                        {canReviewShop ? (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setReviewItem(item)}
                          >
                            <MessageSquarePlus size={16} aria-hidden="true" />
                            Review
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>

                {shopOrder.shipments && shopOrder.shipments.length > 0 ? (
                  <div className="mt-5 space-y-3">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                      <PackageCheck size={16} aria-hidden="true" />
                      Shipments
                    </h3>
                    {shopOrder.shipments.map((shipment) => (
                      <div
                        key={shipment.id}
                        className="rounded-md border border-border bg-surface p-3 text-sm"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-medium text-ink">
                              {shipment.shipmentCode}
                            </p>
                            <p className="mt-1 text-muted">
                              {shipment.shippingCompany.companyName} -{' '}
                              {shipment.shippingService.serviceName}
                            </p>
                          </div>
                          <Badge>{formatStatus(shipment.shipmentStatus)}</Badge>
                        </div>
                        {shipment.trackingHistories.length > 0 ? (
                          <div className="mt-3 space-y-2">
                            {shipment.trackingHistories.map((history) => (
                              <div key={history.id} className="text-muted">
                                <span className="font-medium text-ink">
                                  {formatStatus(history.toStatus)}
                                </span>{' '}
                                {formatDateTime(history.createdAt)}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>

        <aside className="h-fit rounded-lg border border-border bg-white p-5 shadow-panel">
          <h2 className="text-lg font-semibold text-ink">Summary</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Subtotal</dt>
              <dd className="font-medium">{formatMoney(order.subtotalAmount)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Discount</dt>
              <dd className="font-medium">{formatMoney(order.discountAmount)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Shipping</dt>
              <dd className="font-medium">
                {formatMoney(order.shippingFeeAmount)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-3">
              <dt className="font-semibold text-ink">Total</dt>
              <dd className="text-lg font-semibold text-primary-700">
                {formatMoney(order.totalAmount)}
              </dd>
            </div>
          </dl>

          <div className="mt-5 rounded-md border border-border bg-surface p-3 text-sm">
            <p className="font-medium text-ink">{order.receiverName}</p>
            <p className="mt-1 text-muted">{order.receiverPhone}</p>
            <p className="mt-2 text-muted">
              {order.shippingAddress.streetAddress}, {order.shippingAddress.ward},{' '}
              {order.shippingAddress.district}, {order.shippingAddress.province}
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {order.payments.map((payment) => (
              <div
                key={payment.id}
                className="rounded-md border border-border bg-white p-3 text-sm"
              >
                <div className="flex justify-between gap-4">
                  <p className="font-medium text-ink">
                    {payment.paymentMethod.methodName}
                  </p>
                  <Badge>{formatStatus(payment.paymentStatus)}</Badge>
                </div>
                <p className="mt-1 text-muted">{payment.paymentCode}</p>
                <p className="mt-1 font-semibold">{formatMoney(payment.amount)}</p>
              </div>
            ))}
          </div>

          <ButtonLink to="/orders" variant="secondary">
            <CheckCircle2 size={16} aria-hidden="true" />
            Back to orders
          </ButtonLink>
        </aside>
      </section>

      <Modal
        open={isCancelOpen}
        title="Cancel order"
        onClose={() => setIsCancelOpen(false)}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCancelOpen(false)}
            >
              Keep order
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={!cancelReason.trim() || cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Cancel order'}
            </Button>
          </>
        }
      >
        {cancelMutation.isError ? (
          <Alert tone="danger" className="mb-4">
            {getErrorMessage(cancelMutation.error)}
          </Alert>
        ) : null}
        <Textarea
          label="Reason"
          rows={4}
          maxLength={1000}
          value={cancelReason}
          onChange={(event) => setCancelReason(event.target.value)}
        />
      </Modal>

      <ReviewModal item={reviewItem} onClose={() => setReviewItem(null)} />
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, CreditCard, MapPin, ShoppingBag } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { SelectInput } from '@/components/ui/SelectInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { Textarea } from '@/components/ui/Textarea';
import { addressesApi } from '@/features/account/api';
import { cartApi, cartQueryKey } from '@/features/cart/api';
import { getErrorMessage } from '@/services/errors';
import { useToastStore } from '@/stores/toast.store';
import { formatMoney } from '@/utils/format';
import { checkoutApi, paymentsApi } from '../api';

export function CheckoutPage() {
  const [addressId, setAddressId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const pushToast = useToastStore((state) => state.pushToast);

  const cartQuery = useQuery({
    queryKey: cartQueryKey,
    queryFn: cartApi.getCart,
  });

  const addressesQuery = useQuery({
    queryKey: ['account', 'addresses'],
    queryFn: () => addressesApi.list(),
  });

  const paymentMethodsQuery = useQuery({
    queryKey: ['checkout', 'payment-methods'],
    queryFn: paymentsApi.listMethods,
  });

  const selectedItems = useMemo(
    () => cartQuery.data?.items.filter((item) => item.isSelected) ?? [],
    [cartQuery.data?.items],
  );
  const selectedCartItemIds = useMemo(
    () => selectedItems.map((item) => item.id),
    [selectedItems],
  );

  useEffect(() => {
    if (addressId || !addressesQuery.data?.items.length) {
      return;
    }

    const defaultAddress =
      addressesQuery.data.items.find((address) => address.isDefault) ??
      addressesQuery.data.items[0];
    setAddressId(defaultAddress.id);
  }, [addressId, addressesQuery.data?.items]);

  useEffect(() => {
    if (paymentMethodId || !paymentMethodsQuery.data?.length) {
      return;
    }

    setPaymentMethodId(paymentMethodsQuery.data[0].id);
  }, [paymentMethodId, paymentMethodsQuery.data]);

  const previewQuery = useQuery({
    queryKey: [
      'checkout',
      'preview',
      addressId,
      paymentMethodId,
      selectedCartItemIds.join(','),
    ],
    queryFn: () =>
      checkoutApi.preview({
        addressId,
        paymentMethodId,
        selectedCartItemIds,
      }),
    enabled:
      Boolean(addressId) &&
      Boolean(paymentMethodId) &&
      selectedCartItemIds.length > 0,
    retry: false,
  });

  const createOrderMutation = useMutation({
    mutationFn: checkoutApi.createOrder,
    onSuccess: async (order) => {
      await queryClient.invalidateQueries({ queryKey: cartQueryKey });
      pushToast({
        tone: 'success',
        title: 'Order created',
        description: order.orderCode,
      });
      navigate(`/orders/${order.id}`);
    },
  });

  const isLoading =
    cartQuery.isLoading ||
    addressesQuery.isLoading ||
    paymentMethodsQuery.isLoading;
  const hasLoadError =
    cartQuery.isError || addressesQuery.isError || paymentMethodsQuery.isError;
  const addresses = addressesQuery.data?.items ?? [];
  const paymentMethods = paymentMethodsQuery.data ?? [];
  const preview = previewQuery.data;

  if (isLoading) {
    return (
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (hasLoadError) {
    return (
      <ErrorState
        title="Cannot load checkout"
        message="Cart, addresses or payment methods could not be loaded."
      />
    );
  }

  if (selectedItems.length === 0) {
    return (
      <EmptyState
        title="No selected cart items"
        description="Select at least one cart item before checkout."
        action={
          <ButtonLink to="/cart">
            <ShoppingBag size={16} aria-hidden="true" />
            Open cart
          </ButtonLink>
        }
      />
    );
  }

  if (addresses.length === 0) {
    return (
      <EmptyState
        title="No delivery address"
        description="Create an address before placing an order."
        action={
          <ButtonLink to="/addresses">
            <MapPin size={16} aria-hidden="true" />
            Add address
          </ButtonLink>
        }
      />
    );
  }

  if (paymentMethods.length === 0) {
    return (
      <ErrorState
        title="No active payment methods"
        message="The backend has no active payment method for checkout."
      />
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-5">
        <div className="rounded-lg border border-border bg-white p-6 shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
            Checkout
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Place order</h1>
          <p className="mt-2 text-sm text-muted">
            Server preview validates address, payment method and selected cart
            items before order creation.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-white p-5 shadow-panel">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <MapPin size={18} aria-hidden="true" />
            Delivery address
          </h2>
          <div className="mt-4">
            <SelectInput
              label="Address"
              value={addressId}
              onChange={(event) => setAddressId(event.target.value)}
            >
              {addresses.map((address) => (
                <option key={address.id} value={address.id}>
                  {address.receiverName} -{' '}
                  {address.fullAddress ??
                    `${address.streetAddress}, ${address.ward}, ${address.district}`}
                </option>
              ))}
            </SelectInput>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white p-5 shadow-panel">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <CreditCard size={18} aria-hidden="true" />
            Payment
          </h2>
          <div className="mt-4">
            <SelectInput
              label="Payment method"
              value={paymentMethodId}
              onChange={(event) => setPaymentMethodId(event.target.value)}
            >
              {paymentMethods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.methodName}
                  {method.isOnline ? ' - online' : ''}
                </option>
              ))}
            </SelectInput>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white p-5 shadow-panel">
          <h2 className="text-lg font-semibold text-ink">Selected items</h2>
          <div className="mt-4 divide-y divide-border">
            {selectedItems.map((item) => (
              <div key={item.id} className="flex justify-between gap-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-ink">{item.product.productName}</p>
                  <p className="mt-1 text-muted">
                    {item.variant.variantName} x {item.quantity}
                  </p>
                </div>
                <p className="font-semibold text-ink">{formatMoney(item.lineTotal)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white p-5 shadow-panel">
          <Textarea
            label="Customer note"
            rows={4}
            maxLength={1000}
            value={customerNote}
            onChange={(event) => setCustomerNote(event.target.value)}
          />
        </div>
      </section>

      <aside className="h-fit rounded-lg border border-border bg-white p-5 shadow-panel">
        <h2 className="text-lg font-semibold text-ink">Order preview</h2>

        {previewQuery.isError ? (
          <Alert tone="danger" className="mt-4">
            {getErrorMessage(previewQuery.error)}
          </Alert>
        ) : null}

        {previewQuery.isFetching ? (
          <div className="mt-4 space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-4/5" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : null}

        {preview ? (
          <>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Subtotal</dt>
                <dd className="font-medium">{formatMoney(preview.subtotalAmount)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Discount</dt>
                <dd className="font-medium">
                  {formatMoney(preview.discountAmount)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Shipping</dt>
                <dd className="font-medium">
                  {formatMoney(preview.shippingFeeAmount)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-border pt-3">
                <dt className="font-semibold text-ink">Total</dt>
                <dd className="text-lg font-semibold text-primary-700">
                  {formatMoney(preview.totalAmount)}
                </dd>
              </div>
            </dl>

            <div className="mt-5 space-y-3">
              {preview.shopGroups.map((group) => (
                <div
                  key={group.shop.id}
                  className="rounded-md border border-border bg-surface p-3 text-sm"
                >
                  <p className="font-medium text-ink">{group.shop.shopName}</p>
                  <p className="mt-1 text-muted">
                    {group.items.length} item(s), total{' '}
                    {formatMoney(group.totalAmount)}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {createOrderMutation.isError ? (
          <Alert tone="danger" className="mt-4">
            {getErrorMessage(createOrderMutation.error)}
          </Alert>
        ) : null}

        <Button
          type="button"
          className="mt-5 w-full"
          disabled={!preview || createOrderMutation.isPending}
          onClick={() =>
            createOrderMutation.mutate({
              addressId,
              paymentMethodId,
              selectedCartItemIds,
              customerNote: customerNote.trim() || undefined,
            })
          }
        >
          <CheckCircle2 size={16} aria-hidden="true" />
          {createOrderMutation.isPending ? 'Creating order...' : 'Place order'}
        </Button>
      </aside>
    </div>
  );
}

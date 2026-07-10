import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, PackageCheck, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
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
import { TextInput } from '@/components/ui/TextInput';
import { Textarea } from '@/components/ui/Textarea';
import type { OrderShipment } from '@/features/orders/types';
import { getErrorMessage } from '@/services/errors';
import { useToastStore } from '@/stores/toast.store';
import { formatDateTime, formatMoney, formatStatus } from '@/utils/format';
import { sellerOrdersApi, sellerShippingApi } from '../api';

const noteSchema = z.object({
  sellerNote: z.string().trim().max(1000).optional(),
});

const shipmentSchema = z.object({
  shippingServiceId: z.string().min(1, 'Shipping service is required'),
  trackingNumber: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/)
    .or(z.literal(''))
    .optional(),
  pickupAddress: z.string().trim().max(500).optional(),
  expectedDeliveryAt: z.string().optional(),
  note: z.string().trim().max(1000).optional(),
});

const trackingSchema = z.object({
  shipmentStatus: z.enum(['PickedUp', 'InTransit', 'Delivered']),
  trackingNumber: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/)
    .or(z.literal(''))
    .optional(),
  locationText: z.string().trim().max(255).optional(),
  note: z.string().trim().max(1000).optional(),
});

type NoteFormValues = z.infer<typeof noteSchema>;
type ShipmentFormValues = z.infer<typeof shipmentSchema>;
type TrackingFormValues = z.infer<typeof trackingSchema>;

const optionalString = (value: string | undefined) => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : undefined;
};

export function SellerOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const shopOrderId = id ?? '';
  const [noteAction, setNoteAction] = useState<'confirm' | 'prepare' | null>(null);
  const [isShipmentOpen, setIsShipmentOpen] = useState(false);
  const [trackingShipment, setTrackingShipment] = useState<OrderShipment | null>(
    null,
  );
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const noteForm = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: { sellerNote: '' },
  });
  const shipmentForm = useForm<ShipmentFormValues>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
      shippingServiceId: '',
      trackingNumber: '',
      pickupAddress: '',
      expectedDeliveryAt: '',
      note: '',
    },
  });
  const trackingForm = useForm<TrackingFormValues>({
    resolver: zodResolver(trackingSchema),
    defaultValues: {
      shipmentStatus: 'PickedUp',
      trackingNumber: '',
      locationText: '',
      note: '',
    },
  });

  const orderQuery = useQuery({
    queryKey: ['seller', 'orders', 'detail', shopOrderId],
    queryFn: () => sellerOrdersApi.get(shopOrderId),
    enabled: Boolean(shopOrderId),
  });
  const servicesQuery = useQuery({
    queryKey: ['shipping', 'services', orderQuery.data?.shop.id],
    queryFn: () => sellerShippingApi.listActiveServices(orderQuery.data?.shop.id),
    enabled: Boolean(orderQuery.data),
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['seller', 'orders'] }),
      queryClient.invalidateQueries({
        queryKey: ['seller', 'orders', 'detail', shopOrderId],
      }),
    ]);
  };

  const noteMutation = useMutation({
    mutationFn: (values: NoteFormValues) =>
      noteAction === 'confirm'
        ? sellerOrdersApi.confirm(shopOrderId, {
            sellerNote: optionalString(values.sellerNote),
          })
        : sellerOrdersApi.prepare(shopOrderId, {
            sellerNote: optionalString(values.sellerNote),
          }),
    onSuccess: async () => {
      await invalidate();
      pushToast({
        tone: 'success',
        title: noteAction === 'confirm' ? 'Order confirmed' : 'Order prepared',
      });
      setNoteAction(null);
      noteForm.reset({ sellerNote: '' });
    },
  });

  const shipmentMutation = useMutation({
    mutationFn: (values: ShipmentFormValues) =>
      sellerOrdersApi.createShipment(shopOrderId, {
        shippingServiceId: values.shippingServiceId,
        trackingNumber: optionalString(values.trackingNumber),
        pickupAddress: optionalString(values.pickupAddress),
        expectedDeliveryAt: optionalString(values.expectedDeliveryAt),
        note: optionalString(values.note),
      }),
    onSuccess: async () => {
      await invalidate();
      pushToast({ tone: 'success', title: 'Shipment created' });
      setIsShipmentOpen(false);
      shipmentForm.reset();
    },
  });

  const trackingMutation = useMutation({
    mutationFn: (values: TrackingFormValues) =>
      trackingShipment
        ? sellerOrdersApi.updateShipmentTracking(
            shopOrderId,
            trackingShipment.id,
            {
              shipmentStatus: values.shipmentStatus,
              trackingNumber: optionalString(values.trackingNumber),
              locationText: optionalString(values.locationText),
              note: optionalString(values.note),
            },
          )
        : Promise.reject(new Error('Shipment is required')),
    onSuccess: async () => {
      await invalidate();
      pushToast({ tone: 'success', title: 'Tracking updated' });
      setTrackingShipment(null);
      trackingForm.reset();
    },
  });

  useEffect(() => {
    if (trackingShipment) {
      trackingForm.reset({
        shipmentStatus:
          trackingShipment.shipmentStatus === 'Pending' ? 'PickedUp' : 'InTransit',
        trackingNumber: trackingShipment.trackingNumber ?? '',
        locationText: '',
        note: '',
      });
    }
  }, [trackingForm, trackingShipment]);

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
        title="Cannot load seller order"
        message="The seller order was not found or the API is unavailable."
      />
    );
  }

  const order = orderQuery.data;
  const services = servicesQuery.data?.items ?? [];
  const canConfirm = order.orderStatus === 'WaitingForSeller';
  const canPrepare = order.orderStatus === 'Confirmed';
  const canCreateShipment = order.orderStatus === 'Prepared';
  const shipments = order.shipments ?? [];

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
              Seller order
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">{order.shopOrderCode}</h1>
              <Badge>{formatStatus(order.orderStatus)}</Badge>
              <Badge>{formatStatus(order.orderPaymentStatus)}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted">
              Parent order {order.orderCode} | {formatDateTime(order.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canConfirm ? (
              <Button type="button" onClick={() => setNoteAction('confirm')}>
                <CheckCircle2 size={16} aria-hidden="true" />
                Confirm
              </Button>
            ) : null}
            {canPrepare ? (
              <Button type="button" onClick={() => setNoteAction('prepare')}>
                <PackageCheck size={16} aria-hidden="true" />
                Prepare
              </Button>
            ) : null}
            {canCreateShipment ? (
              <Button type="button" onClick={() => setIsShipmentOpen(true)}>
                <Truck size={16} aria-hidden="true" />
                Create shipment
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <article className="rounded-lg border border-border bg-white p-5 shadow-panel">
            <h2 className="text-lg font-semibold">Items</h2>
            <div className="mt-4 divide-y divide-border">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-ink">
                      {item.productNameSnapshot}
                    </p>
                    <p className="text-sm text-muted">
                      {item.variantNameSnapshot ?? 'Default'} x {item.quantity}
                    </p>
                  </div>
                  <p className="font-semibold">{formatMoney(item.lineTotal)}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-lg border border-border bg-white p-5 shadow-panel">
            <h2 className="text-lg font-semibold">Shipments</h2>
            <div className="mt-4 space-y-3">
              {shipments.length > 0 ? (
                shipments.map((shipment) => (
                  <div
                    key={shipment.id}
                    className="rounded-md border border-border bg-surface p-4 text-sm"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-medium text-ink">
                          {shipment.shipmentCode}
                        </p>
                        <p className="mt-1 text-muted">
                          {shipment.shippingService.serviceName} |{' '}
                          {shipment.trackingNumber ?? 'No tracking number'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge>{formatStatus(shipment.shipmentStatus)}</Badge>
                        {shipment.shipmentStatus !== 'Delivered' ? (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setTrackingShipment(shipment)}
                          >
                            Update tracking
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    {shipment.trackingHistories.length > 0 ? (
                      <div className="mt-3 space-y-1 text-muted">
                        {shipment.trackingHistories.map((history) => (
                          <p key={history.id}>
                            {formatStatus(history.toStatus)} -{' '}
                            {formatDateTime(history.createdAt)}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted">No shipment created yet.</p>
              )}
            </div>
          </article>
        </div>

        <aside className="h-fit rounded-lg border border-border bg-white p-5 shadow-panel">
          <h2 className="text-lg font-semibold">Summary</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Subtotal</dt>
              <dd className="font-medium">{formatMoney(order.subtotalAmount)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Shipping</dt>
              <dd className="font-medium">
                {formatMoney(order.shippingFeeAmount)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-3">
              <dt className="font-semibold">Total</dt>
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
          <div className="mt-5">
            <ButtonLink to="/seller/orders" variant="secondary">
              Back to orders
            </ButtonLink>
          </div>
        </aside>
      </section>

      <Modal
        open={Boolean(noteAction)}
        title={noteAction === 'confirm' ? 'Confirm order' : 'Prepare order'}
        onClose={() => setNoteAction(null)}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setNoteAction(null)}
            >
              Cancel
            </Button>
            <Button type="submit" form="seller-note-form" disabled={noteMutation.isPending}>
              {noteMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </>
        }
      >
        {noteMutation.isError ? (
          <Alert tone="danger" className="mb-4">
            {getErrorMessage(noteMutation.error)}
          </Alert>
        ) : null}
        <form
          id="seller-note-form"
          onSubmit={noteForm.handleSubmit((values) => noteMutation.mutate(values))}
        >
          <Textarea
            label="Seller note"
            rows={4}
            error={noteForm.formState.errors.sellerNote?.message}
            {...noteForm.register('sellerNote')}
          />
        </form>
      </Modal>

      <Modal
        open={isShipmentOpen}
        title="Create shipment"
        onClose={() => setIsShipmentOpen(false)}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsShipmentOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="shipment-form"
              disabled={shipmentMutation.isPending}
            >
              {shipmentMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </>
        }
      >
        {shipmentMutation.isError || servicesQuery.isError ? (
          <Alert tone="danger" className="mb-4">
            {getErrorMessage(shipmentMutation.error ?? servicesQuery.error)}
          </Alert>
        ) : null}
        <form
          id="shipment-form"
          className="space-y-4"
          onSubmit={shipmentForm.handleSubmit((values) =>
            shipmentMutation.mutate(values),
          )}
        >
          <SelectInput
            label="Shipping service"
            error={shipmentForm.formState.errors.shippingServiceId?.message}
            {...shipmentForm.register('shippingServiceId')}
          >
            <option value="">Select service</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.serviceName} - {formatMoney(service.baseFee)}
              </option>
            ))}
          </SelectInput>
          <TextInput
            label="Tracking number"
            error={shipmentForm.formState.errors.trackingNumber?.message}
            {...shipmentForm.register('trackingNumber')}
          />
          <TextInput
            label="Pickup address"
            error={shipmentForm.formState.errors.pickupAddress?.message}
            {...shipmentForm.register('pickupAddress')}
          />
          <TextInput
            label="Expected delivery"
            type="date"
            error={shipmentForm.formState.errors.expectedDeliveryAt?.message}
            {...shipmentForm.register('expectedDeliveryAt')}
          />
          <Textarea
            label="Note"
            rows={3}
            error={shipmentForm.formState.errors.note?.message}
            {...shipmentForm.register('note')}
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(trackingShipment)}
        title="Update tracking"
        onClose={() => setTrackingShipment(null)}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setTrackingShipment(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="tracking-form"
              disabled={trackingMutation.isPending}
            >
              {trackingMutation.isPending ? 'Updating...' : 'Update'}
            </Button>
          </>
        }
      >
        {trackingMutation.isError ? (
          <Alert tone="danger" className="mb-4">
            {getErrorMessage(trackingMutation.error)}
          </Alert>
        ) : null}
        <form
          id="tracking-form"
          className="space-y-4"
          onSubmit={trackingForm.handleSubmit((values) =>
            trackingMutation.mutate(values),
          )}
        >
          <SelectInput
            label="Shipment status"
            error={trackingForm.formState.errors.shipmentStatus?.message}
            {...trackingForm.register('shipmentStatus')}
          >
            <option value="PickedUp">Picked up</option>
            <option value="InTransit">In transit</option>
            <option value="Delivered">Delivered</option>
          </SelectInput>
          <TextInput
            label="Tracking number"
            error={trackingForm.formState.errors.trackingNumber?.message}
            {...trackingForm.register('trackingNumber')}
          />
          <TextInput
            label="Location"
            error={trackingForm.formState.errors.locationText?.message}
            {...trackingForm.register('locationText')}
          />
          <Textarea
            label="Note"
            rows={3}
            error={trackingForm.formState.errors.note?.message}
            {...trackingForm.register('note')}
          />
        </form>
      </Modal>
    </div>
  );
}

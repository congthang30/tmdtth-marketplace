import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, PackageCheck, RefreshCw, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import { z } from "zod";
import { ErrorState } from "@/components/common/ErrorState";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Modal } from "@/components/ui/Modal";
import { SelectInput } from "@/components/ui/SelectInput";
import { Skeleton } from "@/components/ui/Skeleton";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import type { OrderShipment } from "@/features/orders/types";
import { getErrorMessage } from "@/services/errors";
import { useToastStore } from "@/stores/toast.store";
import { formatDateTime, formatMoney, formatStatus } from "@/utils/format";
import { sellerOrdersApi, sellerShippingApi } from "../api";

const noteSchema = z.object({
  sellerNote: z.string().trim().max(1000, "Ghi chú quá dài").optional(),
});

const shipmentSchema = z.object({
  shippingServiceId: z.string().min(1, "Vui lòng chọn dịch vụ vận chuyển"),
  trackingNumber: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/, "Mã vận đơn không hợp lệ")
    .or(z.literal(""))
    .optional(),
  pickupAddress: z
    .string()
    .trim()
    .max(500, "Địa chỉ lấy hàng quá dài")
    .optional(),
  expectedDeliveryAt: z.string().optional(),
  note: z.string().trim().max(1000, "Ghi chú quá dài").optional(),
});

const trackingSchema = z.object({
  shipmentStatus: z.enum(["PickedUp", "InTransit", "Delivered"]),
  trackingNumber: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/, "Mã vận đơn không hợp lệ")
    .or(z.literal(""))
    .optional(),
  locationText: z
    .string()
    .trim()
    .max(255, "Thông tin vị trí quá dài")
    .optional(),
  note: z.string().trim().max(1000, "Ghi chú quá dài").optional(),
});

type NoteFormValues = z.infer<typeof noteSchema>;
type ShipmentFormValues = z.infer<typeof shipmentSchema>;
type TrackingFormValues = z.infer<typeof trackingSchema>;

const optionalString = (value: string | undefined) => {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : undefined;
};

export function SellerOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const shopOrderId = id ?? "";
  const [noteAction, setNoteAction] = useState<"confirm" | "prepare" | null>(
    null,
  );
  const [isShipmentOpen, setIsShipmentOpen] = useState(false);
  const [trackingShipment, setTrackingShipment] =
    useState<OrderShipment | null>(null);
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const noteForm = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: { sellerNote: "" },
  });
  const shipmentForm = useForm<ShipmentFormValues>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
      shippingServiceId: "",
      trackingNumber: "",
      pickupAddress: "",
      expectedDeliveryAt: "",
      note: "",
    },
  });
  const trackingForm = useForm<TrackingFormValues>({
    resolver: zodResolver(trackingSchema),
    defaultValues: {
      shipmentStatus: "PickedUp",
      trackingNumber: "",
      locationText: "",
      note: "",
    },
  });

  const orderQuery = useQuery({
    queryKey: ["seller", "orders", "detail", shopOrderId],
    queryFn: () => sellerOrdersApi.get(shopOrderId),
    enabled: Boolean(shopOrderId),
  });
  const servicesQuery = useQuery({
    queryKey: ["shipping", "services", orderQuery.data?.shop.id],
    queryFn: () =>
      sellerShippingApi.listActiveServices(orderQuery.data?.shop.id),
    enabled: Boolean(orderQuery.data),
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["seller", "orders"] }),
      queryClient.invalidateQueries({
        queryKey: ["seller", "orders", "detail", shopOrderId],
      }),
    ]);
  };

  const noteMutation = useMutation({
    mutationFn: (values: NoteFormValues) =>
      noteAction === "confirm"
        ? sellerOrdersApi.confirm(shopOrderId, {
            sellerNote: optionalString(values.sellerNote),
          })
        : sellerOrdersApi.prepare(shopOrderId, {
            sellerNote: optionalString(values.sellerNote),
          }),
    onSuccess: async () => {
      await invalidate();
      pushToast({
        tone: "success",
        title:
          noteAction === "confirm"
            ? "Đã xác nhận đơn hàng"
            : "Đã chuẩn bị đơn hàng",
      });
      setNoteAction(null);
      noteForm.reset({ sellerNote: "" });
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
      pushToast({ tone: "success", title: "Đã tạo vận đơn" });
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
        : Promise.reject(new Error("Shipment is required")),
    onSuccess: async () => {
      await invalidate();
      pushToast({ tone: "success", title: "Đã cập nhật hành trình" });
      setTrackingShipment(null);
      trackingForm.reset();
    },
  });

  const syncMutation = useMutation({
    mutationFn: (shipmentId: string) =>
      sellerOrdersApi.syncShipment(shopOrderId, shipmentId),
    onSuccess: async () => {
      await invalidate();
      pushToast({ tone: "success", title: "Đã đồng bộ trạng thái vận đơn" });
    },
  });

  useEffect(() => {
    if (trackingShipment) {
      trackingForm.reset({
        shipmentStatus:
          trackingShipment.shipmentStatus === "Pending"
            ? "PickedUp"
            : "InTransit",
        trackingNumber: trackingShipment.trackingNumber ?? "",
        locationText: "",
        note: "",
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
        title="Không thể tải đơn hàng"
        message="Không tìm thấy đơn hàng hoặc hệ thống đang tạm thời gián đoạn."
      />
    );
  }

  const order = orderQuery.data;
  const services = servicesQuery.data?.items ?? [];
  const canConfirm = order.orderStatus === "WaitingForSeller";
  const canPrepare = order.orderStatus === "Confirmed";
  const canCreateShipment = order.orderStatus === "Prepared";
  const shipments = order.shipments ?? [];

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
              Đơn hàng của gian hàng
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">{order.shopOrderCode}</h1>
              <Badge>{formatStatus(order.orderStatus)}</Badge>
              <Badge>{formatStatus(order.orderPaymentStatus)}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted">
              Đơn hàng chính {order.orderCode} |{" "}
              {formatDateTime(order.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canConfirm ? (
              <Button type="button" onClick={() => setNoteAction("confirm")}>
                <CheckCircle2 size={16} aria-hidden="true" />
                Xác nhận
              </Button>
            ) : null}
            {canPrepare ? (
              <Button type="button" onClick={() => setNoteAction("prepare")}>
                <PackageCheck size={16} aria-hidden="true" />
                Chuẩn bị hàng
              </Button>
            ) : null}
            {canCreateShipment ? (
              <Button type="button" onClick={() => setIsShipmentOpen(true)}>
                <Truck size={16} aria-hidden="true" />
                Tạo vận đơn
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <article className="rounded-lg border border-border bg-white p-5 shadow-panel">
            <h2 className="text-lg font-semibold">Sản phẩm</h2>
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
                      {item.variantNameSnapshot ?? "Mặc định"} x {item.quantity}
                    </p>
                  </div>
                  <p className="font-semibold">{formatMoney(item.lineTotal)}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-lg border border-border bg-white p-5 shadow-panel">
            <h2 className="text-lg font-semibold">Vận đơn</h2>
            {syncMutation.isError ? (
              <Alert tone="danger" className="mt-3">
                {getErrorMessage(syncMutation.error)}
              </Alert>
            ) : null}
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
                          {shipment.shippingCompany.provider} ·{" "}
                          {shipment.shippingService.serviceName}
                        </p>
                        <p className="mt-1 text-muted">
                          Mã vận đơn hãng:{" "}
                          {shipment.carrierOrderCode ??
                            shipment.trackingNumber ??
                            "Chưa có mã vận đơn"}
                        </p>
                        {shipment.carrierStatus ? (
                          <p className="mt-1 text-xs text-muted">
                            Trạng thái từ hãng: {shipment.carrierStatus}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge>{formatStatus(shipment.shipmentStatus)}</Badge>
                        {shipment.shipmentStatus !== "Delivered" ? (
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={
                              syncMutation.isPending &&
                              syncMutation.variables === shipment.id
                            }
                            onClick={() => syncMutation.mutate(shipment.id)}
                          >
                            <RefreshCw size={14} aria-hidden="true" />
                            {syncMutation.isPending &&
                            syncMutation.variables === shipment.id
                              ? "Đang đồng bộ..."
                              : "Đồng bộ trạng thái"}
                          </Button>
                        ) : null}
                        {shipment.shipmentStatus !== "Delivered" ? (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setTrackingShipment(shipment)}
                          >
                            Cập nhật hành trình
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    {shipment.trackingHistories.length > 0 ? (
                      <div className="mt-3 space-y-1 text-muted">
                        {shipment.trackingHistories.map((history) => (
                          <p key={history.id}>
                            {formatStatus(history.toStatus)} -{" "}
                            {formatDateTime(history.createdAt)}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted">Chưa tạo vận đơn.</p>
              )}
            </div>
          </article>
        </div>

        <aside className="h-fit rounded-lg border border-border bg-white p-5 shadow-panel">
          <h2 className="text-lg font-semibold">Tóm tắt</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Tạm tính</dt>
              <dd className="font-medium">
                {formatMoney(order.subtotalAmount)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Phí vận chuyển</dt>
              <dd className="font-medium">
                {formatMoney(order.shippingFeeAmount)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-3">
              <dt className="font-semibold">Tổng cộng</dt>
              <dd className="text-lg font-semibold text-primary-700">
                {formatMoney(order.totalAmount)}
              </dd>
            </div>
          </dl>
          <div className="mt-5 rounded-md border border-border bg-surface p-3 text-sm">
            <p className="font-medium text-ink">{order.receiverName}</p>
            <p className="mt-1 text-muted">{order.receiverPhone}</p>
            <p className="mt-2 text-muted">
              {order.shippingAddress.streetAddress},{" "}
              {order.shippingAddress.ward},{" "}
              {order.shippingAddress.province}
            </p>
          </div>
          <div className="mt-5">
            <ButtonLink to="/seller/orders" variant="secondary">
              Quay lại đơn hàng
            </ButtonLink>
          </div>
        </aside>
      </section>

      <Modal
        open={Boolean(noteAction)}
        title={
          noteAction === "confirm" ? "Xác nhận đơn hàng" : "Chuẩn bị đơn hàng"
        }
        onClose={() => setNoteAction(null)}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setNoteAction(null)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              form="seller-note-form"
              disabled={noteMutation.isPending}
            >
              {noteMutation.isPending ? "Đang lưu..." : "Lưu"}
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
          onSubmit={noteForm.handleSubmit((values) =>
            noteMutation.mutate(values),
          )}
        >
          <Textarea
            label="Ghi chú của người bán"
            rows={4}
            error={noteForm.formState.errors.sellerNote?.message}
            {...noteForm.register("sellerNote")}
          />
        </form>
      </Modal>

      <Modal
        open={isShipmentOpen}
        title="Tạo vận đơn"
        onClose={() => setIsShipmentOpen(false)}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsShipmentOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              form="shipment-form"
              disabled={shipmentMutation.isPending}
            >
              {shipmentMutation.isPending ? "Đang tạo..." : "Tạo vận đơn"}
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
            label="Dịch vụ vận chuyển"
            error={shipmentForm.formState.errors.shippingServiceId?.message}
            {...shipmentForm.register("shippingServiceId")}
          >
            <option value="">Chọn dịch vụ</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.serviceName} - {service.estimatedMinDays}-
                {service.estimatedMaxDays} ngày
              </option>
            ))}
          </SelectInput>
          <TextInput
            label="Mã vận đơn"
            error={shipmentForm.formState.errors.trackingNumber?.message}
            {...shipmentForm.register("trackingNumber")}
          />
          <TextInput
            label="Địa chỉ lấy hàng"
            error={shipmentForm.formState.errors.pickupAddress?.message}
            {...shipmentForm.register("pickupAddress")}
          />
          <TextInput
            label="Ngày giao dự kiến"
            type="date"
            error={shipmentForm.formState.errors.expectedDeliveryAt?.message}
            {...shipmentForm.register("expectedDeliveryAt")}
          />
          <Textarea
            label="Ghi chú"
            rows={3}
            error={shipmentForm.formState.errors.note?.message}
            {...shipmentForm.register("note")}
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(trackingShipment)}
        title="Cập nhật hành trình"
        onClose={() => setTrackingShipment(null)}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setTrackingShipment(null)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              form="tracking-form"
              disabled={trackingMutation.isPending}
            >
              {trackingMutation.isPending ? "Đang cập nhật..." : "Cập nhật"}
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
            label="Trạng thái vận đơn"
            error={trackingForm.formState.errors.shipmentStatus?.message}
            {...trackingForm.register("shipmentStatus")}
          >
            <option value="PickedUp">Đã lấy hàng</option>
            <option value="InTransit">Đang vận chuyển</option>
            <option value="Delivered">Đã giao hàng</option>
          </SelectInput>
          <TextInput
            label="Mã vận đơn"
            error={trackingForm.formState.errors.trackingNumber?.message}
            {...trackingForm.register("trackingNumber")}
          />
          <TextInput
            label="Vị trí"
            error={trackingForm.formState.errors.locationText?.message}
            {...trackingForm.register("locationText")}
          />
          <Textarea
            label="Ghi chú"
            rows={3}
            error={trackingForm.formState.errors.note?.message}
            {...trackingForm.register("note")}
          />
        </form>
      </Modal>
    </div>
  );
}

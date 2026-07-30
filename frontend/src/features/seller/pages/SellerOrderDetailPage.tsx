import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  MapPin,
  PackageCheck,
  Printer,
  RefreshCw,
  Truck,
} from "lucide-react";
import { useState } from "react";
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
import { Textarea } from "@/components/ui/Textarea";
import { getErrorMessage } from "@/services/errors";
import { useToastStore } from "@/stores/toast.store";
import { formatDateTime, formatMoney, formatStatus } from "@/utils/format";
import { sellerOrdersApi } from "../api";

const noteSchema = z.object({
  sellerNote: z.string().trim().max(1000, "Ghi chú quá dài").optional(),
});

const shipmentSchema = z
  .object({
    handoverMethod: z.enum(["Pickup", "Dropoff"]),
    pickupStationId: z.string().optional(),
  })
  .superRefine((value, context) => {
    if (value.handoverMethod === "Dropoff" && !value.pickupStationId) {
      context.addIssue({
        code: "custom",
        path: ["pickupStationId"],
        message: "Vui lòng chọn bưu cục GHN",
      });
    }
  });

type NoteFormValues = z.infer<typeof noteSchema>;
type ShipmentFormValues = z.infer<typeof shipmentSchema>;

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
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const noteForm = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: { sellerNote: "" },
  });
  const shipmentForm = useForm<ShipmentFormValues>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
      handoverMethod: "Pickup",
      pickupStationId: "",
    },
  });
  const handoverMethod = shipmentForm.watch("handoverMethod");

  const orderQuery = useQuery({
    queryKey: ["seller", "orders", "detail", shopOrderId],
    queryFn: () => sellerOrdersApi.get(shopOrderId),
    enabled: Boolean(shopOrderId),
  });
  const stationQuery = useQuery({
    queryKey: [
      "seller",
      "orders",
      shopOrderId,
      "handover-stations",
      handoverMethod,
    ],
    queryFn: () =>
      sellerOrdersApi.listHandoverStations(shopOrderId, handoverMethod),
    enabled:
      Boolean(shopOrderId) && isShipmentOpen && handoverMethod === "Dropoff",
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
        handoverMethod: values.handoverMethod,
        pickupStationId:
          values.handoverMethod === "Dropoff"
            ? Number(values.pickupStationId)
            : undefined,
      }),
    onSuccess: async () => {
      await invalidate();
      pushToast({
        tone: "success",
        title: "GHN đã tiếp nhận vận đơn",
        description: "Đơn hàng đã chuyển sang Chờ lấy hàng.",
      });
      setIsShipmentOpen(false);
      shipmentForm.reset({
        handoverMethod: "Pickup",
        pickupStationId: "",
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: (shipmentId: string) =>
      sellerOrdersApi.syncShipment(shopOrderId, shipmentId),
    onSuccess: async (shipment) => {
      await invalidate();
      pushToast({
        tone: "success",
        title:
          shipment.shipmentStatus === "Pending"
            ? "GHN đã tiếp nhận vận đơn"
            : "Đã đồng bộ trạng thái từ GHN",
      });
    },
  });

  const labelMutation = useMutation({
    mutationFn: (shipmentId: string) =>
      sellerOrdersApi.createShipmentLabel(shopOrderId, shipmentId),
    onSuccess: ({ printUrl }) => {
      window.open(printUrl, "_blank", "noopener,noreferrer");
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
        title="Không thể tải đơn hàng"
        message="Không tìm thấy đơn hàng hoặc hệ thống đang tạm thời gián đoạn."
      />
    );
  }

  const order = orderQuery.data;
  const shippingSelection = order.shippingSelection;
  const canConfirm = order.orderStatus === "WaitingForSeller";
  const canPrepare = order.orderStatus === "Confirmed";
  const canCreateShipment =
    order.orderStatus === "Prepared" && Boolean(shippingSelection);
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
                Sắp xếp vận chuyển
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
            {order.orderStatus === "Prepared" && !shippingSelection ? (
              <Alert tone="danger" className="mt-3">
                Đơn hàng chưa có lựa chọn vận chuyển của khách. Vui lòng liên hệ
                bộ phận hỗ trợ trước khi tạo vận đơn.
              </Alert>
            ) : null}
            {(syncMutation.isError || labelMutation.isError) ? (
              <Alert tone="danger" className="mt-3">
                {getErrorMessage(syncMutation.error ?? labelMutation.error)}
              </Alert>
            ) : null}
            <div className="mt-4 space-y-3">
              {shipments.length > 0 ? (
                shipments.map((shipment) => {
                  const isSyncFailed = shipment.shipmentStatus === "SyncFailed";
                  const isSyncing =
                    syncMutation.isPending &&
                    syncMutation.variables === shipment.id;
                  const isPrinting =
                    labelMutation.isPending &&
                    labelMutation.variables === shipment.id;

                  return (
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
                            {shipment.shippingCompany.companyName} ·{" "}
                            {shipment.shippingService.serviceName}
                          </p>
                          <p className="mt-1 text-muted">
                            Mã GHN: {shipment.carrierOrderCode ?? "Chưa được cấp"}
                          </p>
                          <p className="mt-1 text-muted">
                            Bàn giao: {shipment.handoverMethod === "Dropoff"
                              ? "Gửi tại bưu cục"
                              : "GHN đến lấy hàng"}
                          </p>
                          {shipment.pickupStation ? (
                            <p className="mt-1 flex items-start gap-1.5 text-muted">
                              <MapPin
                                className="mt-0.5 shrink-0"
                                size={14}
                                aria-hidden="true"
                              />
                              <span>
                                {shipment.pickupStation.name} ·{" "}
                                {shipment.pickupStation.address}
                              </span>
                            </p>
                          ) : null}
                          {shipment.carrierStatus ? (
                            <p className="mt-1 text-xs text-muted">
                              GHN: {shipment.carrierStatus}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge>{formatStatus(shipment.shipmentStatus)}</Badge>
                          {isSyncFailed ? (
                            <Button
                              type="button"
                              disabled={isSyncing}
                              onClick={() => syncMutation.mutate(shipment.id)}
                            >
                              <RefreshCw size={14} aria-hidden="true" />
                              {isSyncing ? "Đang thử lại..." : "Thử đăng ký lại"}
                            </Button>
                          ) : shipment.carrierOrderCode &&
                            shipment.shipmentStatus !== "Delivered" ? (
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={isSyncing}
                              onClick={() => syncMutation.mutate(shipment.id)}
                            >
                              <RefreshCw size={14} aria-hidden="true" />
                              {isSyncing ? "Đang đồng bộ..." : "Đồng bộ từ GHN"}
                            </Button>
                          ) : null}
                          {shipment.carrierOrderCode ? (
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={isPrinting}
                              onClick={() => labelMutation.mutate(shipment.id)}
                            >
                              <Printer size={14} aria-hidden="true" />
                              {isPrinting ? "Đang tạo nhãn..." : "In nhãn A5"}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      {isSyncFailed ? (
                        <Alert tone="danger" className="mt-3">
                          GHN chưa tiếp nhận vận đơn. Đơn vẫn ở trạng thái Chờ
                          sắp xếp; kiểm tra cấu hình giao hàng rồi thử đăng ký lại.
                        </Alert>
                      ) : null}
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
                  );
                })
              ) : (
                <p className="text-sm text-muted">Chưa sắp xếp vận chuyển.</p>
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
          {shippingSelection ? (
            <div className="mt-5 rounded-md border border-border bg-surface p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Vận chuyển khách đã chọn
              </p>
              <p className="mt-2 font-medium text-ink">
                {shippingSelection.shippingCompany.companyName}
              </p>
              <p className="mt-1 text-muted">
                {shippingSelection.shippingService.serviceName} · Dự kiến{" "}
                {shippingSelection.estimatedMinDays}-
                {shippingSelection.estimatedMaxDays} ngày
              </p>
            </div>
          ) : null}
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
        title="Sắp xếp vận chuyển"
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
              disabled={
                shipmentMutation.isPending ||
                (handoverMethod === "Dropoff" && stationQuery.isLoading)
              }
            >
              {shipmentMutation.isPending
                ? "Đang đăng ký với GHN..."
                : "Xác nhận bàn giao"}
            </Button>
          </>
        }
      >
        {shipmentMutation.isError ? (
          <Alert tone="danger" className="mb-4">
            <span className="font-medium">GHN chưa tiếp nhận vận đơn.</span>{" "}
            {getErrorMessage(shipmentMutation.error)} Đơn hàng vẫn ở trạng thái
            Chờ sắp xếp; bạn có thể thử lại trên vận đơn đã lưu.
          </Alert>
        ) : null}
        <form
          id="shipment-form"
          className="space-y-4"
          onSubmit={shipmentForm.handleSubmit((values) =>
            shipmentMutation.mutate(values),
          )}
        >
          {shippingSelection ? (
            <div className="rounded-md border border-border bg-surface p-4">
              <div className="flex items-start gap-3">
                <Truck
                  className="mt-0.5 shrink-0 text-primary-700"
                  size={20}
                  aria-hidden="true"
                />
                <div className="min-w-0 text-sm">
                  <p className="font-medium text-ink">
                    {shippingSelection.shippingCompany.companyName} ·{" "}
                    {shippingSelection.shippingService.serviceName}
                  </p>
                  <p className="mt-1 text-muted">
                    Dịch vụ đã được khách chọn khi thanh toán và không thể thay
                    đổi. Phí vận chuyển {formatMoney(order.shippingFeeAmount)}, dự
                    kiến {shippingSelection.estimatedMinDays}-
                    {shippingSelection.estimatedMaxDays} ngày.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <Alert tone="danger">
              Không tìm thấy lựa chọn vận chuyển của khách. Chưa thể sắp xếp vận
              chuyển.
            </Alert>
          )}

          <fieldset>
            <legend className="text-sm font-medium text-ink">
              Cách bàn giao cho GHN
            </legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-border bg-white p-3 text-sm focus-within:ring-2 focus-within:ring-primary-600">
                <input
                  type="radio"
                  value="Pickup"
                  {...shipmentForm.register("handoverMethod")}
                />
                <span>
                  <span className="block font-medium text-ink">
                    GHN đến lấy hàng
                  </span>
                  <span className="mt-1 block text-muted">
                    Bàn giao tại địa chỉ kho của gian hàng.
                  </span>
                </span>
              </label>
              <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-border bg-white p-3 text-sm focus-within:ring-2 focus-within:ring-primary-600">
                <input
                  type="radio"
                  value="Dropoff"
                  {...shipmentForm.register("handoverMethod")}
                />
                <span>
                  <span className="block font-medium text-ink">
                    Gửi tại bưu cục GHN
                  </span>
                  <span className="mt-1 block text-muted">
                    Chọn một điểm gửi hàng khả dụng gần kho.
                  </span>
                </span>
              </label>
            </div>
          </fieldset>

          {handoverMethod === "Dropoff" ? (
            stationQuery.isLoading ? (
              <div role="status" className="space-y-2">
                <Skeleton className="h-11 w-full" />
                <p className="text-sm text-muted">Đang tải bưu cục GHN...</p>
              </div>
            ) : stationQuery.isError ? (
              <Alert tone="danger">
                {getErrorMessage(stationQuery.error)}
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-3"
                  onClick={() => void stationQuery.refetch()}
                >
                  <RefreshCw size={14} aria-hidden="true" />
                  Tải lại bưu cục
                </Button>
              </Alert>
            ) : stationQuery.data?.items.length ? (
              <SelectInput
                label="Bưu cục bàn giao"
                error={shipmentForm.formState.errors.pickupStationId?.message}
                {...shipmentForm.register("pickupStationId")}
              >
                <option value="">Chọn bưu cục GHN</option>
                {stationQuery.data.items.map((station) => (
                  <option key={station.id} value={station.id}>
                    {station.name} — {station.address}
                  </option>
                ))}
              </SelectInput>
            ) : (
              <Alert tone="danger">
                Chưa có bưu cục GHN khả dụng cho địa chỉ kho. Chọn “GHN đến lấy
                hàng” hoặc kiểm tra lại địa chỉ gian hàng.
              </Alert>
            )
          ) : null}
        </form>
      </Modal>
    </div>
  );
}

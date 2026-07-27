import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  CreditCard,
  MapPin,
  Plus,
  ShoppingBag,
  Ticket,
  Truck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { SelectInput } from "@/components/ui/SelectInput";
import { Skeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { addressesApi } from "@/features/account/api";
import { cartApi, cartQueryKey } from "@/features/cart/api";
import { VoucherSelector } from "@/features/vouchers/components/VoucherSelector";
import { orderPaymentsApi } from "@/features/orders/api";
import { getErrorMessage } from "@/services/errors";
import { useToastStore } from "@/stores/toast.store";
import { formatMoney } from "@/utils/format";
import { checkoutApi, checkoutShippingApi, paymentsApi } from "../api";
import type {
  CheckoutPreviewShopGroup,
  CheckoutShippingSelectionRequest,
  ShippingQuote,
} from "../types";

const getGroupWeightGram = (group: CheckoutPreviewShopGroup) =>
  Math.max(
    1,
    group.items.reduce(
      (total, item) =>
        total + Math.max(1, item.variant.weightGram) * item.quantity,
      0,
    ),
  );

export function CheckoutPage() {
  const [addressId, setAddressId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [selectedServiceByShopId, setSelectedServiceByShopId] = useState<
    Record<string, string>
  >({});
  const [quoteByShopId, setQuoteByShopId] = useState<
    Record<string, ShippingQuote>
  >({});
  const [quoteErrorByShopId, setQuoteErrorByShopId] = useState<
    Record<string, string>
  >({});
  const [appliedPlatformVoucherCode, setAppliedPlatformVoucherCode] =
    useState("");
  const [appliedShopVoucherByShopId, setAppliedShopVoucherByShopId] =
    useState<Record<string, string>>({});
  const [voucherSelector, setVoucherSelector] = useState<
    | { scope: "Platform" }
    | { scope: "Shop"; shopId: string; shopName: string; subtotal: string }
    | null
  >(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const pushToast = useToastStore((state) => state.pushToast);

  const cartQuery = useQuery({
    queryKey: cartQueryKey,
    queryFn: cartApi.getCart,
  });

  const addressesQuery = useQuery({
    queryKey: ["account", "addresses"],
    queryFn: () => addressesApi.list(),
  });

  const paymentMethodsQuery = useQuery({
    queryKey: ["checkout", "payment-methods"],
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
  const selectedCartItemKey = selectedCartItemIds.join(",");
  const selectedShopIds = useMemo(
    () => [...new Set(selectedItems.map((item) => item.shop.id))],
    [selectedItems],
  );
  const shippingSelections = useMemo<
    CheckoutShippingSelectionRequest[] | undefined
  >(() => {
    if (selectedShopIds.length === 0) {
      return undefined;
    }

    const selections = selectedShopIds
      .map((shopId) => {
        const quote = quoteByShopId[shopId];
        const shippingServiceId = selectedServiceByShopId[shopId];

        if (!quote || !shippingServiceId) {
          return null;
        }

        return {
          shopId,
          shippingServiceId,
          shippingQuoteId: quote.id,
        };
      })
      .filter((selection): selection is CheckoutShippingSelectionRequest =>
        Boolean(selection),
      );

    return selections.length === selectedShopIds.length
      ? selections
      : undefined;
  }, [quoteByShopId, selectedServiceByShopId, selectedShopIds]);

  const shopVoucherCodes = useMemo(() => {
    const entries = Object.entries(appliedShopVoucherByShopId).filter(
      ([shopId, code]) => code.trim() && selectedShopIds.includes(shopId),
    );
    return entries.length > 0
      ? entries.map(([shopId, voucherCode]) => ({ shopId, voucherCode }))
      : undefined;
  }, [appliedShopVoucherByShopId, selectedShopIds]);

  const shippingServicesQuery = useQuery({
    queryKey: ["checkout", "shipping-services", selectedShopIds[0] ?? ""],
    queryFn: () => checkoutShippingApi.listActiveServices(selectedShopIds[0]),
    enabled: selectedShopIds.length > 0,
  });

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

  useEffect(() => {
    setQuoteByShopId({});
    setQuoteErrorByShopId({});
  }, [addressId, selectedCartItemKey]);

  useEffect(() => {
    const defaultService = shippingServicesQuery.data?.items[0];

    if (!defaultService || selectedShopIds.length === 0) {
      return;
    }

    setSelectedServiceByShopId((current) => {
      const next = { ...current };

      for (const shopId of selectedShopIds) {
        next[shopId] ??= defaultService.id;
      }

      return next;
    });
  }, [selectedShopIds, shippingServicesQuery.data?.items]);

  const previewQuery = useQuery({
    queryKey: [
      "checkout",
      "preview",
      addressId,
      paymentMethodId,
      selectedCartItemKey,
      shippingSelections
        ?.map((selection) => selection.shippingQuoteId)
        .join(",") ?? "",
      appliedPlatformVoucherCode,
      JSON.stringify(shopVoucherCodes ?? []),
    ],
    queryFn: () =>
      checkoutApi.preview({
        addressId,
        paymentMethodId,
        selectedCartItemIds,
        shippingSelections,
        platformVoucherCode: appliedPlatformVoucherCode || undefined,
        shopVoucherCodes,
      }),
    enabled:
      Boolean(addressId) &&
      Boolean(paymentMethodId) &&
      selectedCartItemIds.length > 0,
    retry: false,
  });

  const shippingServices = useMemo(
    () => shippingServicesQuery.data?.items ?? [],
    [shippingServicesQuery.data?.items],
  );

  const quoteMutation = useMutation({
    mutationFn: ({
      group,
      shippingServiceId,
    }: {
      group: CheckoutPreviewShopGroup;
      shippingServiceId: string;
    }) =>
      checkoutShippingApi.createQuote({
        shopId: group.shop.id,
        shippingServiceId,
        destinationProvince: previewQuery.data?.address.province ?? "",
        destinationWard: previewQuery.data?.address.ward ?? "",
        totalWeightGram: getGroupWeightGram(group),
      }),
    onMutate: ({ group }) => {
      setQuoteErrorByShopId((current) => {
        const next = { ...current };
        delete next[group.shop.id];
        return next;
      });
    },
    onSuccess: (quote) => {
      setQuoteByShopId((current) => ({
        ...current,
        [quote.shop.id]: quote,
      }));
    },
    onError: (error, { group }) => {
      setQuoteErrorByShopId((current) => ({
        ...current,
        [group.shop.id]: getErrorMessage(error),
      }));
    },
  });

  useEffect(() => {
    if (
      !addressId ||
      quoteMutation.isPending ||
      !previewQuery.data ||
      shippingServices.length === 0
    ) {
      return;
    }

    const group = previewQuery.data.shopGroups.find(
      (item) =>
        !quoteByShopId[item.shop.id] && !quoteErrorByShopId[item.shop.id],
    );
    if (!group) {
      return;
    }

    const shippingServiceId =
      selectedServiceByShopId[group.shop.id] ?? shippingServices[0].id;
    quoteMutation.mutate({ group, shippingServiceId });
  }, [
    addressId,
    previewQuery.data,
    quoteByShopId,
    quoteErrorByShopId,
    quoteMutation,
    selectedServiceByShopId,
    shippingServices,
  ]);

  const createOrderMutation = useMutation({
    mutationFn: checkoutApi.createOrder,
    onSuccess: async (order) => {
      await queryClient.invalidateQueries({ queryKey: cartQueryKey });
      pushToast({
        tone: "success",
        title: "Đã tạo đơn hàng",
        description: order.orderCode,
      });
      const pendingVnpayPayment = order.payments.find(
        (payment) =>
          payment.paymentMethod.methodCode === "VNPAY" &&
          payment.paymentStatus === "Pending",
      );
      if (pendingVnpayPayment) {
        try {
          const result = await orderPaymentsApi.createVnpayPaymentUrl(
            pendingVnpayPayment.id,
          );
          window.location.assign(result.paymentUrl);
          return;
        } catch {
          pushToast({
            tone: "info",
            title: "Đơn hàng đã được tạo",
            description:
              "Chưa thể mở VNPay. Bạn có thể thanh toán lại trong chi tiết đơn.",
          });
        }
      }
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
  const hasAllShippingQuotes =
    selectedShopIds.length > 0 &&
    selectedShopIds.every((shopId) => Boolean(quoteByShopId[shopId]));

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
        title="Không thể tải trang thanh toán"
        message="Không thể tải giỏ hàng, địa chỉ hoặc phương thức thanh toán."
      />
    );
  }

  if (selectedItems.length === 0) {
    return (
      <EmptyState
        title="Chưa chọn sản phẩm"
        description="Vui lòng chọn ít nhất một sản phẩm trong giỏ hàng trước khi thanh toán."
        action={
          <ButtonLink to="/cart">
            <ShoppingBag size={16} aria-hidden="true" />
            Mở giỏ hàng
          </ButtonLink>
        }
      />
    );
  }


  if (paymentMethods.length === 0) {
    return (
      <ErrorState
        title="Không có phương thức thanh toán"
        message="Hiện chưa có phương thức thanh toán khả dụng. Vui lòng thử lại sau."
      />
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-5">
        <div className="rounded-lg border border-border bg-white p-6 shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
            Thanh toán
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Xác nhận đặt hàng</h1>
          <p className="mt-2 text-sm text-muted">
            Kiểm tra địa chỉ, phương thức thanh toán và sản phẩm trước khi tạo
            đơn hàng.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-white p-5 shadow-panel">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
              <MapPin size={18} aria-hidden="true" />
              Địa chỉ giao hàng
            </h2>
            <ButtonLink to="/addresses" variant="secondary">
              <Plus size={16} aria-hidden="true" />
              Thêm địa chỉ mới
            </ButtonLink>
          </div>

          {addresses.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-border bg-surface p-5 text-center">
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-primary-50 text-primary-700">
                <MapPin size={20} aria-hidden="true" />
              </span>
              <h3 className="mt-3 font-semibold text-ink">
                Chưa có địa chỉ giao hàng
              </h3>
              <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted">
                Thêm thông tin người nhận để tiếp tục chọn vận chuyển và đặt
                hàng.
              </p>
              <div className="mt-4">
                <ButtonLink to="/addresses">
                  <Plus size={16} aria-hidden="true" />
                  Thêm địa chỉ
                </ButtonLink>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <SelectInput
                label="Địa chỉ nhận hàng"
                value={addressId}
                onChange={(event) => setAddressId(event.target.value)}
              >
                {addresses.map((address) => (
                  <option key={address.id} value={address.id}>
                    {address.isDefault ? "[Mặc định] " : ""}
                    {address.receiverName} · {address.phoneNumber} ·{" "}
                    {address.fullAddress ??
                      `${address.streetAddress}, ${address.ward}, ${address.province}`}
                  </option>
                ))}
              </SelectInput>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-white p-5 shadow-panel">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <CreditCard size={18} aria-hidden="true" />
            Thanh toán
          </h2>
          <fieldset className="mt-4">
            <legend className="text-sm font-medium text-ink">
              Phương thức thanh toán
            </legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {paymentMethods.map((method) => {
                const isSelected = paymentMethodId === method.id;

                return (
                  <label
                    key={method.id}
                    className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2 ${
                      isSelected
                        ? "border-primary-600 bg-primary-50"
                        : "border-border bg-surface hover:border-primary-300"
                    }`}
                  >
                    {method.methodCode === "VNPAY" ? (
                      <span className="flex h-11 w-20 shrink-0 items-center justify-center rounded-md border border-border bg-white p-1.5">
                        <img
                          src="/brands/vnpay.svg"
                          alt="VNPAY"
                          className="h-full w-full object-contain"
                        />
                      </span>
                    ) : (
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-border bg-white text-primary-700">
                        <CreditCard size={22} aria-hidden="true" />
                        <span className="sr-only">Thanh toán khi nhận hàng</span>
                      </span>
                    )}
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.id}
                      checked={isSelected}
                      onChange={(event) => setPaymentMethodId(event.target.value)}
                      className="h-4 w-4 shrink-0 accent-primary-600"
                    />
                    <span className="min-w-0">
                      <span className="block font-medium text-ink">
                        {method.methodName}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {method.isOnline
                          ? "Thanh toán trực tuyến"
                          : "Thanh toán khi nhận hàng"}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>

        <div className="rounded-lg border border-border bg-white p-5 shadow-panel">
          <h2 className="text-lg font-semibold text-ink">Sản phẩm đã chọn</h2>
          <div className="mt-4 divide-y divide-border">
            {selectedItems.map((item) => (
              <div
                key={item.id}
                className="flex justify-between gap-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-ink">
                    {item.product.productName}
                  </p>
                  <p className="mt-1 text-muted">
                    {item.variant.variantName} x {item.quantity}
                  </p>
                </div>
                <p className="font-semibold text-ink">
                  {formatMoney(item.lineTotal)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white p-5 shadow-panel">
          <div className="flex min-h-11 items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
              <Ticket size={18} aria-hidden="true" />
              Voucher toàn hệ thống
            </h2>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setVoucherSelector({ scope: "Platform" })}
            >
              {appliedPlatformVoucherCode ? "Đổi voucher" : "Chọn voucher"}
            </Button>
          </div>
          {preview?.platformVoucher ? (
            <Alert tone="info" className="mt-3">
              Đã áp dụng mã {preview.platformVoucher.voucherCode} — giảm{" "}
              {formatMoney(preview.platformVoucher.discountAmount)}
            </Alert>
          ) : null}
        </div>

        <div className="rounded-lg border border-border bg-white p-5 shadow-panel">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <Truck size={18} aria-hidden="true" />
            Vận chuyển
          </h2>
          {!addressId ? (
            <Alert tone="info" className="mt-4">
              Hãy thêm và chọn địa chỉ giao hàng trước khi chọn dịch vụ vận
              chuyển.
            </Alert>
          ) : shippingServicesQuery.isError ? (
            <Alert tone="danger" className="mt-4">
              {getErrorMessage(shippingServicesQuery.error)}
            </Alert>
          ) : null}
          {!addressId ? null : shippingServicesQuery.isLoading ? (
            <div className="mt-4 space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : shippingServices.length === 0 ? (
            <Alert tone="danger" className="mt-4">
              Hiện chưa có dịch vụ vận chuyển khả dụng.
            </Alert>
          ) : (
            <div className="mt-4 space-y-3">
              {preview?.shopGroups.map((group) => {
                const selectedServiceId =
                  selectedServiceByShopId[group.shop.id] ?? shippingServices[0].id;
                const shippingService =
                  shippingServices.find(
                    (service) => service.id === selectedServiceId,
                  ) ?? shippingServices[0];
                const quote = quoteByShopId[group.shop.id];
                const quoteError = quoteErrorByShopId[group.shop.id];
                const isQuoting =
                  quoteMutation.isPending &&
                  quoteMutation.variables?.group.shop.id === group.shop.id;

                return (
                  <div
                    key={group.shop.id}
                    className="rounded-md border border-border bg-surface p-3"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex h-12 w-20 shrink-0 items-center justify-center rounded-md border border-border bg-white p-1.5">
                          <img
                            src="/brands/ghn.svg"
                            alt="Giao Hàng Nhanh"
                            className="h-full w-full object-contain"
                          />
                        </span>
                        <div>
                          <p className="font-medium text-ink">
                            {group.shop.shopName}
                          </p>
                          <p className="mt-1 text-sm text-muted">
                            {shippingService.serviceName} · dự kiến{" "}
                            {shippingService.estimatedMinDays}-
                            {shippingService.estimatedMaxDays} ngày
                          </p>
                        </div>
                      </div>
                      {quote ? (
                        <p className="text-base font-semibold text-primary-700">
                          {formatMoney(quote.quotedFee)}
                        </p>
                      ) : isQuoting ? (
                        <p className="text-sm text-muted" role="status">
                          Đang tự động lấy báo giá...
                        </p>
                      ) : null}
                    </div>
                    {quoteError ? (
                      <Alert tone="danger" className="mt-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <span>{quoteError}</span>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                              setQuoteErrorByShopId((current) => {
                                const next = { ...current };
                                delete next[group.shop.id];
                                return next;
                              });
                            }}
                          >
                            Thử lại
                          </Button>
                        </div>
                      </Alert>
                    ) : null}
                    <div className="mt-3 flex min-h-11 flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                      <div>
                        <p className="text-sm font-medium text-ink">
                          Voucher của {group.shop.shopName}
                        </p>
                        {group.shopVoucher ? (
                          <p className="mt-1 text-xs text-primary-700">
                            {group.shopVoucher.voucherCode} — giảm{" "}
                            {formatMoney(group.shopVoucher.discountAmount)}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-muted">
                            Chọn mã phù hợp với giá trị sản phẩm của gian hàng
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          setVoucherSelector({
                            scope: "Shop",
                            shopId: group.shop.id,
                            shopName: group.shop.shopName,
                            subtotal: group.subtotalAmount,
                          })
                        }
                      >
                        {appliedShopVoucherByShopId[group.shop.id]
                          ? "Đổi voucher"
                          : "Chọn voucher"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-white p-5 shadow-panel">
          <Textarea
            label="Ghi chú của khách hàng"
            rows={4}
            maxLength={1000}
            value={customerNote}
            onChange={(event) => setCustomerNote(event.target.value)}
          />
        </div>
      </section>

      <aside className="h-fit rounded-lg border border-border bg-white p-5 shadow-panel">
        <h2 className="text-lg font-semibold text-ink">Tóm tắt đơn hàng</h2>

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
                <dt className="text-muted">Tạm tính</dt>
                <dd className="font-medium">
                  {formatMoney(preview.subtotalAmount)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Giảm giá</dt>
                <dd className="font-medium">
                  {formatMoney(preview.discountAmount)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Phí vận chuyển</dt>
                <dd className="font-medium">
                  {formatMoney(preview.shippingFeeAmount)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-border pt-3">
                <dt className="font-semibold text-ink">Tổng cộng</dt>
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
                    {group.items.length} sản phẩm, tổng cộng{" "}
                    {formatMoney(group.totalAmount)}
                  </p>
                  {group.shopVoucher ? (
                    <p className="mt-1 flex items-center gap-1 text-emerald-700">
                      <Ticket size={13} aria-hidden="true" />
                      {group.shopVoucher.voucherCode}: -
                      {formatMoney(group.shopVoucher.discountAmount)}
                    </p>
                  ) : null}
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
          disabled={
            !preview || !hasAllShippingQuotes || createOrderMutation.isPending
          }
          onClick={() =>
            createOrderMutation.mutate({
              addressId,
              paymentMethodId,
              selectedCartItemIds,
              shippingSelections,
              platformVoucherCode: appliedPlatformVoucherCode || undefined,
              shopVoucherCodes,
              customerNote: customerNote.trim() || undefined,
            })
          }
        >
          <CheckCircle2 size={16} aria-hidden="true" />
          {createOrderMutation.isPending ? "Đang tạo đơn..." : "Đặt hàng"}
        </Button>
      </aside>

      <VoucherSelector
        open={voucherSelector !== null}
        title={
          voucherSelector?.scope === "Shop"
            ? `Chọn voucher của ${voucherSelector.shopName}`
            : "Chọn voucher toàn hệ thống"
        }
        shopId={
          voucherSelector?.scope === "Shop" ? voucherSelector.shopId : undefined
        }
        subtotal={
          voucherSelector?.scope === "Shop"
            ? voucherSelector.subtotal
            : (preview?.subtotalAmount ?? "0")
        }
        selectedCode={
          voucherSelector?.scope === "Shop"
            ? appliedShopVoucherByShopId[voucherSelector.shopId]
            : appliedPlatformVoucherCode
        }
        onClose={() => setVoucherSelector(null)}
        onConfirm={(voucherCode) => {
          if (voucherSelector?.scope === "Shop") {
            setAppliedShopVoucherByShopId((current) => ({
              ...current,
              [voucherSelector.shopId]: voucherCode,
            }));
          } else {
            setAppliedPlatformVoucherCode(voucherCode);
          }
          setVoucherSelector(null);
        }}
      />
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Check, Ticket, TicketPercent } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { TextInput } from "@/components/ui/TextInput";
import { getErrorMessage } from "@/services/errors";
import { formatMoney } from "@/utils/format";
import { availableVouchersApi } from "../api";
import type { VoucherSummary } from "../types";

type VoucherSelectorProps = {
  open: boolean;
  title: string;
  shopId?: string;
  subtotal: string;
  selectedCode?: string;
  onClose: () => void;
  onConfirm: (voucherCode: string) => void;
};

function describeDiscount(voucher: VoucherSummary) {
  if (voucher.discountType === "Percentage") {
    return `Giảm ${voucher.discountValue}%${
      voucher.maxDiscountAmount
        ? `, tối đa ${formatMoney(voucher.maxDiscountAmount)}`
        : ""
    }`;
  }

  return `Giảm ${formatMoney(voucher.discountValue)}`;
}

function describeEligibility(voucher: VoucherSummary) {
  if (voucher.discountTarget === "Shipping") {
    return "Áp dụng cho phí vận chuyển";
  }
  if (voucher.productScope === "SpecificProducts" && (voucher.products?.length ?? 0) > 0) {
    return `Áp dụng cho: ${(voucher.products ?? []).map((product) => product.productName).join(", ")}`;
  }
  if (voucher.productScope === "Categories" && (voucher.categories?.length ?? 0) > 0) {
    return `Áp dụng cho: ${(voucher.categories ?? []).map((category) => category.categoryName).join(", ")}`;
  }
  return "Áp dụng cho tất cả sản phẩm";
}

export function VoucherSelector({
  open,
  title,
  shopId,
  subtotal,
  selectedCode,
  onClose,
  onConfirm,
}: VoucherSelectorProps) {
  const [draftCode, setDraftCode] = useState(selectedCode ?? "");
  const [manualCode, setManualCode] = useState("");

  const vouchersQuery = useQuery({
    queryKey: ["vouchers", "available", shopId ?? "platform", subtotal],
    queryFn: () => availableVouchersApi.listAvailable({ shopId, subtotal }),
    enabled: open,
    retry: false,
  });

  useEffect(() => {
    if (open) {
      setDraftCode(selectedCode ?? "");
      setManualCode("");
    }
  }, [open, selectedCode]);

  const vouchers = useMemo(
    () =>
      (vouchersQuery.data ?? []).filter((voucher) =>
        shopId ? voucher.scope === "Shop" : voucher.scope === "Platform",
      ),
    [shopId, vouchersQuery.data],
  );
  const eligibleVouchers = vouchers.filter((voucher) => voucher.isEligible);
  const ineligibleVouchers = vouchers.filter((voucher) => !voucher.isEligible);

  const applyManualCode = () => {
    const normalizedCode = manualCode.trim().toUpperCase();
    if (normalizedCode) {
      setDraftCode(normalizedCode);
    }
  };

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Trở lại
          </Button>
          <Button
            type="button"
            disabled={!draftCode}
            onClick={() => onConfirm(draftCode)}
          >
            Đồng ý
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 rounded-lg bg-surface p-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <TextInput
            label="Mã voucher"
            placeholder="Nhập mã voucher"
            value={manualCode}
            onChange={(event) => setManualCode(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyManualCode();
              }
            }}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={!manualCode.trim()}
          onClick={applyManualCode}
        >
          Áp dụng
        </Button>
      </div>

      {vouchersQuery.isLoading ? (
        <div className="mt-5 space-y-3" aria-label="Đang tải voucher">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : null}

      {vouchersQuery.isError ? (
        <Alert tone="danger" className="mt-5">
          {getErrorMessage(vouchersQuery.error)}
        </Alert>
      ) : null}

      {!vouchersQuery.isLoading && !vouchersQuery.isError ? (
        <div className="mt-5 space-y-5">
          <section aria-labelledby="eligible-vouchers-heading">
            <h3 id="eligible-vouchers-heading" className="font-semibold text-ink">
              Voucher có thể áp dụng ({eligibleVouchers.length})
            </h3>
            {eligibleVouchers.length > 0 ? (
              <div className="mt-3 space-y-3">
                {eligibleVouchers.map((voucher) => {
                  const checked = draftCode === voucher.voucherCode;
                  return (
                    <label
                      key={voucher.id}
                      className={[
                        "flex min-h-28 cursor-pointer gap-3 rounded-lg border bg-white p-3 transition",
                        checked
                          ? "border-primary-600 ring-2 ring-primary-100"
                          : "border-border hover:border-primary-300",
                      ].join(" ")}
                    >
                      <span className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-700">
                        <TicketPercent size={28} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-ink">
                          {voucher.voucherName}
                        </span>
                        <span className="mt-1 block text-sm text-primary-700">
                          {describeDiscount(voucher)}
                        </span>
                        <span className="mt-1 block text-xs font-medium text-ink">
                          {describeEligibility(voucher)}
                        </span>
                        <span className="mt-1 block text-xs text-muted">
                          Giá trị tối thiểu {formatMoney(voucher.minOrderAmount)} · HSD{" "}
                          {new Intl.DateTimeFormat("vi-VN").format(
                            new Date(voucher.endAt),
                          )}
                        </span>
                        <span className="mt-2 inline-flex rounded bg-surface px-2 py-1 font-mono text-xs font-semibold text-ink">
                          {voucher.voucherCode}
                        </span>
                      </span>
                      <input
                        type="radio"
                        name={`voucher-${shopId ?? "platform"}`}
                        value={voucher.voucherCode}
                        checked={checked}
                        onChange={() => setDraftCode(voucher.voucherCode)}
                        className="mt-5 h-5 w-5 shrink-0 accent-primary-600"
                        aria-label={`Chọn voucher ${voucher.voucherName}`}
                      />
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="mt-3 rounded-lg border border-dashed border-border p-5 text-center">
                <Ticket className="mx-auto text-muted" size={28} aria-hidden="true" />
                <p className="mt-2 text-sm font-medium text-ink">
                  Chưa có voucher phù hợp
                </p>
                <p className="mt-1 text-xs text-muted">
                  Bạn vẫn có thể nhập mã voucher ở phía trên.
                </p>
              </div>
            )}
          </section>

          {ineligibleVouchers.length > 0 ? (
            <section aria-labelledby="ineligible-vouchers-heading">
              <h3 id="ineligible-vouchers-heading" className="font-semibold text-ink">
                Chưa đủ điều kiện ({ineligibleVouchers.length})
              </h3>
              <div className="mt-3 space-y-2">
                {ineligibleVouchers.map((voucher) => (
                  <div
                    key={voucher.id}
                    className="flex gap-3 rounded-lg border border-border bg-surface p-3 opacity-75"
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-white text-muted">
                      <Ticket size={22} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{voucher.voucherName}</p>
                      <p className="mt-1 text-sm text-muted">
                        {describeDiscount(voucher)}
                      </p>
                      <p className="mt-1 text-xs text-muted">{describeEligibility(voucher)}</p>
                      <p className="mt-1 text-xs text-danger">
                        Cần giá trị đủ điều kiện tối thiểu {formatMoney(voucher.minOrderAmount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {draftCode ? (
            <p className="flex items-center gap-2 rounded-lg bg-primary-50 p-3 text-sm font-medium text-primary-700">
              <Check size={16} aria-hidden="true" />
              Đã chọn mã {draftCode}
            </p>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}

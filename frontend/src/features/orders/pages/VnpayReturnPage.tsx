import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Alert } from "@/components/ui/Alert";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Skeleton } from "@/components/ui/Skeleton";
import { orderPaymentsApi } from "../api";

export function VnpayReturnPage() {
  const [searchParams] = useSearchParams();
  const params = Object.fromEntries(searchParams.entries());
  const resultQuery = useQuery({
    queryKey: ["payments", "vnpay", "return", searchParams.toString()],
    queryFn: () => orderPaymentsApi.getVnpayReturnResult(params),
    retry: false,
  });

  if (resultQuery.isLoading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12" aria-label="Đang xác minh thanh toán">
        <Skeleton className="mx-auto h-64 w-full" />
      </main>
    );
  }

  if (resultQuery.isError || !resultQuery.data) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <Alert tone="danger">
          Không thể xác minh kết quả VNPay. Vui lòng mở chi tiết đơn hàng để kiểm tra trạng thái thanh toán.
        </Alert>
        <Link className="mt-5 inline-block text-sm font-semibold text-primary-700" to="/orders">
          Xem đơn hàng của tôi
        </Link>
      </main>
    );
  }

  const result = resultQuery.data;
  const pending = result.paymentStatus === "Pending";
  const Icon = result.success ? CheckCircle2 : pending ? Clock3 : XCircle;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <section className="rounded-xl border border-border bg-white p-6 text-center shadow-panel sm:p-10">
        <span className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${result.success ? "bg-primary-50 text-primary-700" : "bg-surface text-muted"}`}>
          <Icon size={34} aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold text-ink">
          {result.success
            ? "Thanh toán thành công"
            : pending
              ? "Đang xác nhận thanh toán"
              : "Thanh toán chưa thành công"}
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted">
          {result.message}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {result.orderId ? (
            <ButtonLink to={`/orders/${result.orderId}`}>Xem chi tiết đơn</ButtonLink>
          ) : null}
          <ButtonLink to="/orders" variant="secondary">Danh sách đơn hàng</ButtonLink>
        </div>
      </section>
    </main>
  );
}

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Truck, XCircle } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { adminShippingProvidersApi } from "../api";

const companyStatusLabel: Record<string, string> = {
  Approved: "Đang hoạt động",
  PendingApproval: "Chờ kích hoạt",
  Suspended: "Tạm ngưng",
  Inactive: "Ngừng hoạt động",
};

/**
 * Read-only dashboard listing the platform's fixed carrier registry (GHN,
 * and any future 3PL integrations). Carriers are no longer user-owned or
 * CRUD-managed here: the platform uses a single carrier account per
 * provider (configured via server env vars) to register shipments on
 * behalf of every seller, so there is nothing for an admin to create,
 * edit, or delete. This page only surfaces live connectivity status
 * (isConfigured) so admins can diagnose "carrier unreachable" issues.
 */
export function AdminShippingProvidersPage() {
  const providersQuery = useQuery({
    queryKey: ["admin", "shipping-providers"],
    queryFn: () => adminShippingProvidersApi.list(),
  });

  const providers = providersQuery.data ?? [];

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
          Đơn vị vận chuyển
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Đối tác vận chuyển</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Hệ thống sử dụng 1 tài khoản doanh nghiệp duy nhất cho mỗi đơn vị
          vận chuyển (GHN, v.v.) để tự động tạo vận đơn cho toàn bộ người
          bán. Đây là danh sách chỉ đọc — cấu hình được quản lý qua biến môi
          trường phía máy chủ, không thể thêm/sửa/xóa tại đây.
        </p>
      </section>

      {providersQuery.isLoading ? <Skeleton className="h-64 w-full" /> : null}
      {providersQuery.isError ? (
        <ErrorState
          title="Không thể tải danh sách đối tác vận chuyển"
          message="Hệ thống đang tạm thời gián đoạn. Vui lòng thử lại."
        />
      ) : null}
      {!providersQuery.isLoading && !providersQuery.isError ? (
        providers.length > 0 ? (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Đơn vị vận chuyển</TableHeaderCell>
                <TableHeaderCell>Mã nhà cung cấp</TableHeaderCell>
                <TableHeaderCell>Trạng thái</TableHeaderCell>
                <TableHeaderCell className="text-right">
                  Kết nối API
                </TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {providers.map((provider) => (
                <TableRow key={provider.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                        <Truck size={16} aria-hidden="true" />
                      </span>
                      <div>
                        <p className="font-medium">{provider.companyName}</p>
                        <p className="text-xs text-muted">{provider.slug}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-surface px-1.5 py-0.5 text-xs">
                      {provider.provider}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge
                      tone={
                        provider.companyStatus === "Approved"
                          ? "success"
                          : "default"
                      }
                    >
                      {companyStatusLabel[provider.companyStatus] ??
                        provider.companyStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      {provider.isConfigured ? (
                        <Badge tone="success">
                          <CheckCircle2 size={13} aria-hidden="true" />
                          Đã kết nối
                        </Badge>
                      ) : (
                        <Badge tone="danger">
                          <XCircle size={13} aria-hidden="true" />
                          Chưa cấu hình
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            title="Chưa có đối tác vận chuyển"
            description="Hệ thống hiện chưa đăng ký đơn vị vận chuyển nào."
          />
        )
      ) : null}

      <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
        <h2 className="text-sm font-semibold">
          Đơn vị hiển thị "Chưa cấu hình"?
        </h2>
        <p className="mt-2 text-sm text-muted">
          Kiểm tra các biến môi trường tương ứng trên máy chủ backend (ví dụ{" "}
          <code className="rounded bg-surface px-1 py-0.5 text-xs">
            GHN_TOKEN
          </code>{" "}
          và{" "}
          <code className="rounded bg-surface px-1 py-0.5 text-xs">
            GHN_SHOP_ID
          </code>
          ). Khi thiếu, đơn vị đó không thể tạo báo giá hoặc vận đơn cho
          seller cho đến khi được cấu hình.
        </p>
      </section>
    </div>
  );
}

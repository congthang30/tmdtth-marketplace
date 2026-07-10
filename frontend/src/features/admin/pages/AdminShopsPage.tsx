import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { SelectInput } from "@/components/ui/SelectInput";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { Textarea } from "@/components/ui/Textarea";
import { getErrorMessage } from "@/services/errors";
import { useToastStore } from "@/stores/toast.store";
import { formatDateTime, formatStatus } from "@/utils/format";
import type { Shop } from "@/features/seller/types";
import { adminShopsApi } from "../api";

const statuses = ["", "PendingApproval", "Approved", "Rejected"] as const;

export function AdminShopsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] =
    useState<(typeof statuses)[number]>("PendingApproval");
  const [approveTarget, setApproveTarget] = useState<Shop | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Shop | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const shopsQuery = useQuery({
    queryKey: ["admin", "shops", page, status],
    queryFn: () => adminShopsApi.list(page, 10, status || undefined),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "shops"] });

  const approveMutation = useMutation({
    mutationFn: (shopId: string) => adminShopsApi.approve(shopId),
    onSuccess: async () => {
      await invalidate();
      pushToast({ tone: "success", title: "Đã phê duyệt gian hàng" });
      setApproveTarget(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (shopId: string) =>
      adminShopsApi.reject(shopId, rejectReason.trim() || undefined),
    onSuccess: async () => {
      await invalidate();
      pushToast({ tone: "success", title: "Đã từ chối gian hàng" });
      setRejectTarget(null);
      setRejectReason("");
    },
  });

  const shops = shopsQuery.data?.items ?? [];
  const meta = shopsQuery.data?.meta;

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
              Phê duyệt gian hàng
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Gian hàng</h1>
          </div>
          <SelectInput
            label="Trạng thái"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as (typeof statuses)[number]);
              setPage(1);
            }}
          >
            <option value="">Tất cả</option>
            <option value="PendingApproval">Chờ phê duyệt</option>
            <option value="Approved">Đã phê duyệt</option>
            <option value="Rejected">Đã từ chối</option>
          </SelectInput>
        </div>
      </section>

      {shopsQuery.isLoading ? <Skeleton className="h-96 w-full" /> : null}
      {shopsQuery.isError ? (
        <ErrorState
          title="Không thể tải danh sách gian hàng"
          message="Hệ thống đang tạm thời gián đoạn. Vui lòng thử lại."
        />
      ) : null}
      {!shopsQuery.isLoading && !shopsQuery.isError ? (
        shops.length > 0 ? (
          <div className="space-y-4">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Gian hàng</TableHeaderCell>
                  <TableHeaderCell>Trạng thái</TableHeaderCell>
                  <TableHeaderCell>Liên hệ</TableHeaderCell>
                  <TableHeaderCell>Ngày tạo</TableHeaderCell>
                  <TableHeaderCell className="text-right">
                    Thao tác
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {shops.map((shop) => (
                  <TableRow key={shop.id}>
                    <TableCell>
                      <p className="font-medium">{shop.shopName}</p>
                      <p className="text-xs text-muted">{shop.slug}</p>
                    </TableCell>
                    <TableCell>
                      <Badge>{formatStatus(shop.shopStatus)}</Badge>
                    </TableCell>
                    <TableCell>
                      <p>{shop.email ?? "Chưa có email"}</p>
                      <p className="text-xs text-muted">
                        {shop.phoneNumber ?? "Chưa có số điện thoại"}
                      </p>
                    </TableCell>
                    <TableCell>{formatDateTime(shop.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={shop.shopStatus !== "PendingApproval"}
                          onClick={() => setApproveTarget(shop)}
                        >
                          <CheckCircle2 size={15} aria-hidden="true" />
                          Phê duyệt
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          disabled={shop.shopStatus !== "PendingApproval"}
                          onClick={() => setRejectTarget(shop)}
                        >
                          <XCircle size={15} aria-hidden="true" />
                          Từ chối
                        </Button>
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
            title="Không tìm thấy gian hàng"
            description="Không có gian hàng phù hợp với bộ lọc."
          />
        )
      ) : null}

      <Modal
        open={Boolean(approveTarget)}
        title="Phê duyệt gian hàng"
        onClose={() => setApproveTarget(null)}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setApproveTarget(null)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={approveMutation.isPending}
              onClick={() =>
                approveTarget && approveMutation.mutate(approveTarget.id)
              }
            >
              {approveMutation.isPending ? "Đang phê duyệt..." : "Phê duyệt"}
            </Button>
          </>
        }
      >
        {approveMutation.isError ? (
          <Alert tone="danger">{getErrorMessage(approveMutation.error)}</Alert>
        ) : (
          <p className="text-sm text-muted">
            Bạn có muốn phê duyệt gian hàng {approveTarget?.shopName ?? "này"}{" "}
            không?
          </p>
        )}
      </Modal>

      <Modal
        open={Boolean(rejectTarget)}
        title="Từ chối gian hàng"
        onClose={() => setRejectTarget(null)}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setRejectTarget(null)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={rejectMutation.isPending}
              onClick={() =>
                rejectTarget && rejectMutation.mutate(rejectTarget.id)
              }
            >
              {rejectMutation.isPending ? "Đang từ chối..." : "Từ chối"}
            </Button>
          </>
        }
      >
        {rejectMutation.isError ? (
          <Alert tone="danger" className="mb-4">
            {getErrorMessage(rejectMutation.error)}
          </Alert>
        ) : null}
        <Textarea
          label="Lý do"
          rows={4}
          value={rejectReason}
          onChange={(event) => setRejectReason(event.target.value)}
        />
      </Modal>
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { SelectInput } from '@/components/ui/SelectInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/Table';
import { TextInput } from '@/components/ui/TextInput';
import { formatDateTime, formatStatus } from '@/utils/format';
import type { SellerType, VerificationStatus } from '@/features/seller-verification/types';
import { adminSellerVerificationApi, adminSellerVerificationKeys } from '../api';

export function AdminSellerVerificationsPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<VerificationStatus | ''>('Submitted');
  const [sellerType, setSellerType] = useState<SellerType | ''>('');
  const params = { page, limit: 10, q: q.trim() || undefined, status: status || undefined, sellerType: sellerType || undefined, sortBy: 'submittedAt' as const, sortOrder: 'asc' as const };
  const queueQuery = useQuery({
    queryKey: adminSellerVerificationKeys.list(params),
    queryFn: () => adminSellerVerificationApi.list(params),
  });
  const items = queueQuery.data?.items ?? [];
  const meta = queueQuery.data?.meta;

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-white p-5 shadow-panel sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Xác minh người bán</p>
        <h1 className="mt-2 text-2xl font-semibold">Hàng đợi hồ sơ</h1>
        <p className="mt-2 text-sm text-muted">Tìm kiếm và tiếp nhận hồ sơ theo trạng thái xét duyệt.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <TextInput
            id="admin-verification-search"
            label="Tìm theo gian hàng hoặc tên pháp lý"
            value={q}
            onChange={(event) => { setQ(event.target.value); setPage(1); }}
          />
          <SelectInput id="admin-verification-status" label="Trạng thái" value={status} onChange={(event) => { setStatus(event.target.value as VerificationStatus | ''); setPage(1); }}>
            <option value="">Tất cả</option>
            <option value="Submitted">Đã gửi</option>
            <option value="UnderReview">Đang xét duyệt</option>
            <option value="NeedsRevision">Cần bổ sung</option>
            <option value="Approved">Đã xác minh</option>
            <option value="Rejected">Đã từ chối</option>
            <option value="Suspended">Tạm ngưng</option>
          </SelectInput>
          <SelectInput id="admin-verification-seller-type" label="Loại người bán" value={sellerType} onChange={(event) => { setSellerType(event.target.value as SellerType | ''); setPage(1); }}>
            <option value="">Tất cả</option>
            <option value="Individual">Cá nhân</option>
            <option value="Business">Doanh nghiệp / hộ kinh doanh</option>
          </SelectInput>
        </div>
      </section>

      {queueQuery.isPending ? <Skeleton className="h-96 w-full" /> : null}
      {queueQuery.isError ? <ErrorState title="Không thể tải hàng đợi xác minh" message="Vui lòng thử lại sau." /> : null}
      {!queueQuery.isPending && !queueQuery.isError ? (
        items.length === 0 ? (
          <EmptyState title="Không có hồ sơ phù hợp" description="Thử thay đổi từ khóa hoặc bộ lọc trạng thái." />
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHead><TableRow>
                <TableHeaderCell>Người bán</TableHeaderCell><TableHeaderCell>Loại hình</TableHeaderCell>
                <TableHeaderCell>Trạng thái</TableHeaderCell><TableHeaderCell>Tài liệu</TableHeaderCell>
                <TableHeaderCell>Ngày gửi</TableHeaderCell><TableHeaderCell className="text-right">Thao tác</TableHeaderCell>
              </TableRow></TableHead>
              <TableBody>{items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell><p className="font-medium">{item.shop.shopName}</p><p className="text-xs text-muted">{item.legalName} · MST {item.taxCodeMasked}</p></TableCell>
                  <TableCell>{item.sellerType === 'Individual' ? 'Cá nhân' : 'Doanh nghiệp'}</TableCell>
                  <TableCell><Badge>{formatStatus(item.verificationStatus)}</Badge></TableCell>
                  <TableCell>{item.documentCount}</TableCell>
                  <TableCell>{item.submittedAt ? formatDateTime(item.submittedAt) : 'Chưa gửi'}</TableCell>
                  <TableCell><div className="flex justify-end"><Link to={`/admin/seller-verifications/${item.id}`}><Button type="button" variant="secondary" className="min-h-11"><Search size={16} aria-hidden="true" />Mở hồ sơ</Button></Link></div></TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
            <Pagination page={meta?.page ?? page} totalPages={meta?.totalPages ?? 1} onPageChange={setPage} />
          </div>
        )
      ) : null}
    </div>
  );
}

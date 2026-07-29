import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, PackageCheck, XCircle } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { SelectInput } from '@/components/ui/SelectInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/Table';
import { useToastStore } from '@/stores/toast.store';
import { formatMoney, formatStatus } from '@/utils/format';
import { adminProductsApi } from '../api';

const statuses = ['', 'PendingApproval', 'Published', 'Rejected', 'Draft'] as const;

export function AdminProductsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<(typeof statuses)[number]>('PendingApproval');
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const query = useQuery({ queryKey: ['admin', 'products', page, status], queryFn: () => adminProductsApi.list(page, 10, status || undefined) });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
  const approve = useMutation({ mutationFn: adminProductsApi.approve, onSuccess: async () => { await invalidate(); pushToast({ tone: 'success', title: 'Đã phê duyệt sản phẩm' }); } });
  const reject = useMutation({ mutationFn: adminProductsApi.reject, onSuccess: async () => { await invalidate(); pushToast({ tone: 'success', title: 'Đã từ chối sản phẩm' }); } });
  const items = query.data?.items ?? [];

  return <div className="space-y-5">
    <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Kiểm soát chất lượng</p><h1 className="mt-2 text-2xl font-semibold">Kiểm duyệt sản phẩm</h1><p className="mt-2 text-sm text-muted">Sản phẩm chỉ xuất hiện trên sàn sau khi được quản trị viên phê duyệt.</p></div>
        <SelectInput id="admin-product-status" label="Trạng thái" value={status} onChange={(event) => { setStatus(event.target.value as (typeof statuses)[number]); setPage(1); }}>
          <option value="">Tất cả</option><option value="PendingApproval">Chờ phê duyệt</option><option value="Published">Đã phê duyệt</option><option value="Rejected">Đã từ chối</option><option value="Draft">Bản nháp</option>
        </SelectInput>
      </div>
    </section>
    {query.isLoading ? <Skeleton className="h-96 w-full" /> : null}
    {query.isError ? <ErrorState title="Không thể tải hàng đợi kiểm duyệt" message="Vui lòng thử lại sau." /> : null}
    {!query.isLoading && !query.isError ? items.length ? <div className="space-y-4"><Table><TableHead><TableRow><TableHeaderCell>Sản phẩm</TableHeaderCell><TableHeaderCell>Gian hàng</TableHeaderCell><TableHeaderCell>Danh mục</TableHeaderCell><TableHeaderCell>Giá</TableHeaderCell><TableHeaderCell>Trạng thái</TableHeaderCell><TableHeaderCell className="text-right">Thao tác</TableHeaderCell></TableRow></TableHead><TableBody>{items.map((product) => <TableRow key={product.id}><TableCell><div className="flex min-w-56 items-center gap-3">{product.images[0]?.imageUrl ? <img src={product.images[0].imageUrl} alt="" className="h-14 w-14 rounded-md object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-md bg-surface"><PackageCheck aria-hidden="true" /></div>}<div><p className="font-medium">{product.productName}</p><p className="text-xs text-muted">{product.slug}</p></div></div></TableCell><TableCell>{product.shop.shopName}</TableCell><TableCell>{product.category.categoryName}</TableCell><TableCell>{formatMoney(product.basePrice)}</TableCell><TableCell><Badge>{formatStatus(product.productStatus)}</Badge></TableCell><TableCell><div className="flex justify-end gap-2"><Button type="button" variant="secondary" disabled={product.productStatus !== 'PendingApproval' || approve.isPending || reject.isPending} onClick={() => approve.mutate(product.id)}><CheckCircle2 size={16} aria-hidden="true" />Duyệt</Button><Button type="button" variant="danger" disabled={product.productStatus !== 'PendingApproval' || approve.isPending || reject.isPending} onClick={() => reject.mutate(product.id)}><XCircle size={16} aria-hidden="true" />Từ chối</Button></div></TableCell></TableRow>)}</TableBody></Table><Pagination page={query.data?.meta?.page ?? page} totalPages={query.data?.meta?.totalPages ?? 1} onPageChange={setPage} /></div> : <EmptyState title="Không có sản phẩm cần xử lý" description="Hàng đợi kiểm duyệt hiện đang trống." /> : null}
  </div>;
}

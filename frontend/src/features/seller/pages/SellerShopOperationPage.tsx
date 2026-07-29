import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextInput } from '@/components/ui/TextInput';
import { sellerShopApi } from '../api';


export function SellerShopOperationPage() {
  const queryClient = useQueryClient();
  const operationQuery = useQuery({ queryKey: ['seller', 'shop', 'operation'], queryFn: sellerShopApi.getOperation });
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [reason, setReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['seller', 'shop'] });
  const mutation = useMutation({
    mutationFn: async (action: 'schedule' | 'indefinite' | 'resume') => {
      if (action === 'schedule') {
        const start = new Date(startsAt);
        const end = new Date(endsAt);
        const maxEnd = new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000);
        if (!startsAt || !endsAt || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start || end <= new Date() || end > maxEnd) {
          throw new Error('Vui lòng chọn khoảng nghỉ hợp lệ, kết thúc trong tương lai và không quá 90 ngày.');
        }
        return sellerShopApi.schedulePause({ startsAt: start.toISOString(), endsAt: end.toISOString(), reason: reason.trim() || undefined });
      }
      if (action === 'indefinite') return sellerShopApi.pauseIndefinitely({ reason: reason.trim() || undefined });
      return sellerShopApi.resume();
    },
    onSuccess: () => { setErrorMessage(null); invalidate(); },
    onError: (error: Error) => setErrorMessage(error.message || 'Không thể cập nhật trạng thái nhận đơn.'),
  });

  if (operationQuery.isLoading) return <Skeleton className="h-72 w-full" />;
  if (operationQuery.isError || !operationQuery.data) return <ErrorState title="Không thể tải trạng thái nhận đơn" message="Vui lòng thử lại sau." />;
  const operation = operationQuery.data;
  const disabled = mutation.isPending || !startsAt || !endsAt;

  return (
    <section className="max-w-3xl space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Cài đặt gian hàng</p>
        <h1 className="mt-2 text-2xl font-semibold">Trạng thái nhận đơn</h1>
        <p className="mt-2 text-sm text-muted">Đơn hàng đã tạo vẫn cần được xử lý theo cam kết, kể cả khi shop tạm nghỉ.</p>
      </div>
      <div className="rounded-lg border border-border bg-white p-5 shadow-panel">
        <p className="text-sm text-muted">Trạng thái hiện tại</p>
        <p className="mt-1 text-xl font-semibold">{operation.isAcceptingOrders ? 'Đang nhận đơn' : operation.operationMode === 'PausedUntil' ? 'Tạm nghỉ theo lịch' : 'Tạm nghỉ vô thời hạn'}</p>
        {operation.pauseEndsAt ? <p className="mt-2 text-sm text-muted">Mở lại dự kiến: {new Date(operation.pauseEndsAt).toLocaleString('vi-VN')}</p> : null}
        {operation.pauseReason ? <p className="mt-1 text-sm text-muted">Lý do: {operation.pauseReason}</p> : null}
        {!operation.isAcceptingOrders && operation.operationMode !== 'PausedUntil' ? <p className="mt-2 text-sm text-muted">Bạn có thể mở nhận đơn lại bằng nút bên dưới.</p> : null}
        {errorMessage ? <p className="mt-4 rounded-md border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700" role="alert">{errorMessage}</p> : null}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <TextInput id="shop-pause-starts-at" label="Bắt đầu nghỉ" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
          <TextInput id="shop-pause-ends-at" label="Kết thúc nghỉ" type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
        </div>
        <div className="mt-4"><TextInput id="shop-pause-reason" label="Lý do (không bắt buộc)" value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} /></div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button type="button" disabled={disabled} onClick={() => mutation.mutate('schedule')}>{mutation.isPending ? 'Đang cập nhật...' : 'Nghỉ theo lịch'}</Button>
          <Button type="button" variant="secondary" disabled={mutation.isPending} onClick={() => mutation.mutate('indefinite')}>Nghỉ đến khi bật lại</Button>
          {!operation.isAcceptingOrders ? <Button type="button" variant="secondary" disabled={mutation.isPending} onClick={() => mutation.mutate('resume')}>Mở nhận đơn</Button> : null}
        </div>
      </div>
    </section>
  );
}

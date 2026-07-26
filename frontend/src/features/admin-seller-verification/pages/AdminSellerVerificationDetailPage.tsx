import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, FileText } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ErrorState } from '@/components/common/ErrorState';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Textarea } from '@/components/ui/Textarea';
import { getErrorMessage } from '@/services/errors';
import { useToastStore } from '@/stores/toast.store';
import { formatDateTime, formatStatus } from '@/utils/format';
import { adminSellerVerificationApi, adminSellerVerificationKeys } from '../api';

const documentLabels: Record<string, string> = {
  IdentityFront: 'Mặt trước giấy tờ định danh', IdentityBack: 'Mặt sau giấy tờ định danh',
  Passport: 'Hộ chiếu', BusinessRegistration: 'Giấy đăng ký kinh doanh',
  LegalRepresentativeIdentity: 'Giấy tờ người đại diện', BankAccountProof: 'Xác nhận tài khoản ngân hàng',
};

type ReviewAction = 'start' | 'revision' | 'approve' | 'reject';
const actionTitles: Record<ReviewAction, string> = {
  start: 'Bắt đầu xét duyệt', revision: 'Yêu cầu người bán bổ sung',
  approve: 'Phê duyệt hồ sơ xác minh', reject: 'Từ chối hồ sơ xác minh',
};

export function AdminSellerVerificationDetailPage() {
  const { id = '' } = useParams();
  const [reviewAction, setReviewAction] = useState<ReviewAction | null>(null);
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const detailQuery = useQuery({
    queryKey: adminSellerVerificationKeys.detail(id),
    queryFn: () => adminSellerVerificationApi.detail(id),
    enabled: Boolean(id),
  });
  const accessMutation = useMutation({
    mutationFn: (documentId: string) => adminSellerVerificationApi.accessDocument(id, documentId),
    onSuccess: ({ signedUrl }) => window.open(signedUrl, '_blank', 'noopener,noreferrer'),
    onError: (error) => pushToast({ tone: 'danger', title: 'Không thể mở tài liệu', description: getErrorMessage(error) }),
  });

  const reviewMutation = useMutation({
    mutationFn: (action: ReviewAction) => {
      if (action === 'start') return adminSellerVerificationApi.startReview(id);
      if (action === 'approve') return adminSellerVerificationApi.approve(id);
      if (action === 'revision') return adminSellerVerificationApi.requestRevision(id, reason.trim());
      return adminSellerVerificationApi.reject(id, reason.trim());
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminSellerVerificationKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: adminSellerVerificationKeys.all }),
      ]);
      pushToast({ tone: 'success', title: 'Đã cập nhật trạng thái hồ sơ' });
      setReviewAction(null);
      setReason('');
    },
  });

  if (detailQuery.isPending) return <Skeleton className="h-[36rem] w-full" />;
  if (detailQuery.isError) return <ErrorState title="Không thể tải hồ sơ xác minh" message="Hồ sơ không tồn tại hoặc hệ thống đang gián đoạn." />;
  const detail = detailQuery.data;
  if (!detail) return <ErrorState title="Không tìm thấy hồ sơ" message="Hồ sơ này không còn khả dụng." />;

  const legalRows = [
    ['Tên pháp lý', detail.legalName], ['Loại người bán', detail.sellerType === 'Individual' ? 'Cá nhân' : 'Doanh nghiệp / hộ kinh doanh'],
    ['Mã số thuế', detail.taxCodeMasked], ['Số giấy tờ', detail.identityNumberMasked],
    ['Số đăng ký kinh doanh', detail.businessRegistrationNumberMasked], ['Người đại diện', detail.legalRepresentativeName],
    ['Địa chỉ đăng ký', detail.registeredAddress],
  ];

  return (
    <div className="space-y-5">
      <Link to="/admin/seller-verifications" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary-700">
        <ArrowLeft size={17} aria-hidden="true" /> Quay lại hàng đợi
      </Link>
      <section className="rounded-lg border border-border bg-white p-5 shadow-panel sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Chi tiết xác minh</p><h1 className="mt-2 text-2xl font-semibold">{detail.shop.shopName}</h1><p className="mt-1 text-sm text-muted">Hồ sơ #{detail.id}</p></div>
          <Badge>{formatStatus(detail.verificationStatus)}</Badge>
        </div>
      </section>

      <section aria-labelledby="admin-legal-title" className="rounded-lg border border-border bg-white p-5 shadow-panel sm:p-6">
        <h2 id="admin-legal-title" className="text-lg font-semibold">Thông tin pháp lý đã che</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">{legalRows.map(([label, value]) => (
          <div key={label} className="rounded-md border border-border p-3"><dt className="text-sm text-muted">{label}</dt><dd className="mt-1 break-words font-medium">{value || 'Không áp dụng'}</dd></div>
        ))}</dl>
      </section>

      <section aria-labelledby="admin-payout-title" className="rounded-lg border border-border bg-white p-5 shadow-panel sm:p-6">
        <h2 id="admin-payout-title" className="text-lg font-semibold">Tài khoản nhận tiền</h2>
        {detail.payoutAccount ? <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div><dt className="text-sm text-muted">Ngân hàng</dt><dd className="font-medium">{detail.payoutAccount.bankName} ({detail.payoutAccount.bankCode})</dd></div>
          <div><dt className="text-sm text-muted">Số tài khoản</dt><dd className="font-medium">{detail.payoutAccount.accountNumberMasked}</dd></div>
          <div><dt className="text-sm text-muted">Chủ tài khoản</dt><dd className="font-medium">{detail.payoutAccount.accountHolderName}</dd></div>
          <div><dt className="text-sm text-muted">Trạng thái</dt><dd><Badge>{formatStatus(detail.payoutAccount.payoutStatus)}</Badge></dd></div>
        </dl> : <Alert tone="danger">Hồ sơ chưa có tài khoản nhận tiền.</Alert>}
      </section>

      <section aria-labelledby="admin-documents-title" className="rounded-lg border border-border bg-white p-5 shadow-panel sm:p-6">
        <h2 id="admin-documents-title" className="text-lg font-semibold">Tài liệu xác minh ({detail.documents.length})</h2>
        {detail.documents.length ? <ul className="mt-4 space-y-2">{detail.documents.map((document) => (
          <li key={document.id} className="flex flex-col gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 gap-3"><FileText size={19} className="shrink-0 text-primary-700" aria-hidden="true" /><div className="min-w-0"><p className="font-medium">{documentLabels[document.documentType] ?? document.documentType}</p><p className="truncate text-sm text-muted">{document.originalFileName} · {Math.ceil(document.bytes / 1024)} KB · {formatDateTime(document.createdAt)}</p></div></div>
            <Button type="button" variant="secondary" className="min-h-11 shrink-0" disabled={accessMutation.isPending} onClick={() => accessMutation.mutate(document.id)}><ExternalLink size={16} aria-hidden="true" />{accessMutation.isPending ? 'Đang mở...' : 'Xem riêng tư'}</Button>
          </li>
        ))}</ul> : <Alert tone="danger">Hồ sơ chưa có tài liệu xác minh.</Alert>}
      </section>

      <section aria-labelledby="admin-review-actions-title" className="rounded-lg border border-border bg-white p-5 shadow-panel sm:p-6">
        <h2 id="admin-review-actions-title" className="text-lg font-semibold">Thao tác xét duyệt</h2>
        <p className="mt-1 text-sm text-muted">Chỉ các chuyển trạng thái hợp lệ mới được hiển thị.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {detail.verificationStatus === 'Submitted' || detail.verificationStatus === 'Suspended' ? (
            <Button type="button" className="min-h-11" onClick={() => setReviewAction('start')}>Bắt đầu xét duyệt</Button>
          ) : null}
          {detail.verificationStatus === 'UnderReview' ? (
            <>
              <Button type="button" variant="secondary" className="min-h-11" onClick={() => setReviewAction('revision')}>Yêu cầu bổ sung</Button>
              <Button type="button" className="min-h-11" onClick={() => setReviewAction('approve')}>Phê duyệt</Button>
              <Button type="button" variant="danger" className="min-h-11" onClick={() => setReviewAction('reject')}>Từ chối</Button>
            </>
          ) : null}
          {!['Submitted', 'Suspended', 'UnderReview'].includes(detail.verificationStatus) ? (
            <Alert>Hồ sơ hiện không có thao tác quản trị hợp lệ.</Alert>
          ) : null}
        </div>
      </section>

      <Modal
        open={Boolean(reviewAction)}
        title={reviewAction ? actionTitles[reviewAction] : 'Xác nhận'}
        onClose={() => { if (!reviewMutation.isPending) { setReviewAction(null); setReason(''); } }}
        footer={<>
          <Button type="button" variant="secondary" disabled={reviewMutation.isPending} onClick={() => { setReviewAction(null); setReason(''); }}>Hủy</Button>
          <Button
            type="button"
            variant={reviewAction === 'reject' ? 'danger' : 'primary'}
            disabled={reviewMutation.isPending || ((reviewAction === 'revision' || reviewAction === 'reject') && (reason.trim().length < 5 || reason.trim().length > 1000))}
            onClick={() => reviewAction && reviewMutation.mutate(reviewAction)}
          >
            {reviewMutation.isPending ? 'Đang cập nhật...' : 'Xác nhận'}
          </Button>
        </>}
      >
        {reviewMutation.isError ? <Alert tone="danger" className="mb-4">{getErrorMessage(reviewMutation.error)}</Alert> : null}
        {reviewAction === 'approve' ? <Alert>Phê duyệt sẽ xác minh hồ sơ và tài khoản nhận tiền. Hành động được ghi vào lịch sử.</Alert> : null}
        {reviewAction === 'start' ? <p className="text-sm text-muted">Xác nhận tiếp nhận và bắt đầu kiểm tra hồ sơ này.</p> : null}
        {reviewAction === 'revision' || reviewAction === 'reject' ? (
          <Textarea label="Lý do" rows={5} maxLength={1000} value={reason} error={reason.length > 0 && reason.trim().length < 5 ? 'Lý do phải có ít nhất 5 ký tự' : undefined} onChange={(event) => setReason(event.target.value)} />
        ) : null}
      </Modal>
    </div>
  );
}

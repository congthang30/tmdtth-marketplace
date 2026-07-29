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
  LegalRepresentativeIdentity: 'Giấy tờ người đại diện', FaceVerification: 'Ảnh khuôn mặt',
};

type ReviewAction = 'revision' | 'approve' | 'reject';
const actionTitles: Record<ReviewAction, string> = {
  revision: 'Yêu cầu người bán bổ sung',
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
    mutationFn: ({ documentId }: { documentId: string; previewWindow: Window }) =>
      adminSellerVerificationApi.accessDocument(id, documentId),
    onSuccess: ({ signedUrl }, { previewWindow }) => {
      previewWindow.location.replace(signedUrl);
    },
    onError: (error, { previewWindow }) => {
      previewWindow.close();
      pushToast({ tone: 'danger', title: 'Không thể mở tài liệu', description: getErrorMessage(error) });
    },
  });

  const openDocument = (documentId: string) => {
    const previewWindow = window.open('', '_blank');
    if (!previewWindow) {
      pushToast({ tone: 'danger', title: 'Trình duyệt đã chặn cửa sổ xem ảnh', description: 'Vui lòng cho phép cửa sổ bật lên cho trang này rồi thử lại.' });
      return;
    }
    previewWindow.document.title = 'Đang mở tài liệu...';
    previewWindow.document.body.textContent = 'Đang tải tài liệu xác minh...';
    accessMutation.mutate({ documentId, previewWindow });
  };

  const reviewMutation = useMutation({
    mutationFn: (action: ReviewAction) => {
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

  const sellerTypeLabel =
    detail.sellerType === 'Individual'
      ? 'Cá nhân'
      : detail.businessType === 'HouseholdBusiness'
        ? 'Hộ kinh doanh'
        : 'Doanh nghiệp';
  const hasFacePhoto = detail.documents.some(
    (document) => document.documentType === 'FaceVerification' && document.documentStatus !== 'Rejected',
  );
  const legalRows = [
    ['Loại hình kinh doanh', sellerTypeLabel],
    [detail.sellerType === 'Individual' ? 'Họ tên/chủ sở hữu' : detail.businessType === 'HouseholdBusiness' ? 'Tên hộ kinh doanh' : 'Tên công ty', detail.legalName],
    ...(detail.sellerType === 'Individual'
      ? [
          ['Loại giấy tờ', detail.identityDocumentType === 'CitizenId' ? 'Căn cước công dân' : detail.identityDocumentType === 'LegacyId' ? 'Chứng minh nhân dân' : detail.identityDocumentType === 'Passport' ? 'Hộ chiếu' : detail.identityDocumentType],
          ['Số giấy tờ', detail.identityNumber],
        ]
      : [
          ['Mã số thuế', detail.taxCode],
          [detail.businessType === 'HouseholdBusiness' ? 'Mã số đăng ký hộ kinh doanh' : 'Mã doanh nghiệp', detail.businessRegistrationNumber],
          ...(detail.identityDocumentType
            ? [['Loại giấy tờ người đại diện', detail.identityDocumentType === 'CitizenId' ? 'Căn cước công dân' : detail.identityDocumentType === 'LegacyId' ? 'Chứng minh nhân dân' : 'Hộ chiếu']]
            : []),
          ...(detail.businessType === 'Company'
            ? [['Người đại diện pháp luật', detail.legalRepresentativeName]]
            : []),
        ]),
    [detail.businessType === 'Company' ? 'Địa chỉ đăng ký doanh nghiệp' : detail.businessType === 'HouseholdBusiness' ? 'Địa chỉ cư trú' : 'Địa chỉ cư trú', detail.registeredAddress],
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

      <section aria-labelledby="admin-shop-title" className="rounded-lg border border-border bg-white p-5 shadow-panel sm:p-6">
        <h2 id="admin-shop-title" className="text-lg font-semibold">Thông tin cửa hàng</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div><dt className="text-sm text-muted">Tên cửa hàng</dt><dd className="mt-1 font-medium">{detail.shop.shopName}</dd></div>
          <div className="sm:col-span-2"><dt className="text-sm text-muted">Địa chỉ cửa hàng</dt><dd className="mt-1 font-medium">{[detail.shop.streetAddress, detail.shop.ward, detail.shop.province].filter(Boolean).join(', ') || 'Chưa cập nhật'}</dd></div>
        </dl>
      </section>

      <section aria-labelledby="admin-legal-title" className="rounded-lg border border-border bg-white p-5 shadow-panel sm:p-6">
        <h2 id="admin-legal-title" className="text-lg font-semibold">Thông tin pháp lý để đối chiếu</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">{legalRows.map(([label, value]) => (
          <div key={label} className="rounded-md border border-border p-3"><dt className="text-sm text-muted">{label}</dt><dd className="mt-1 break-words font-medium">{value || 'Không áp dụng'}</dd></div>
        ))}</dl>
      </section>


      <section aria-labelledby="admin-owner-contact-title" className="rounded-lg border border-border bg-white p-5 shadow-panel sm:p-6">
        <h2 id="admin-owner-contact-title" className="text-lg font-semibold">
          {detail.businessType === 'Company' ? 'Thông tin liên hệ doanh nghiệp' : detail.businessType === 'HouseholdBusiness' ? 'Thông tin hộ kinh doanh và liên hệ' : 'Thông tin cá nhân và liên hệ'}
        </h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {detail.businessType !== 'Company' ? <>
            <div><dt className="text-sm text-muted">{detail.businessType === 'HouseholdBusiness' ? 'Tên hộ kinh doanh' : 'Họ tên/chủ sở hữu'}</dt><dd className="mt-1 font-medium">{detail.legalName}</dd></div>
            <div><dt className="text-sm text-muted">Số CCCD/số định danh</dt><dd className="mt-1 font-medium">{detail.identityNumber || 'Chưa cập nhật'}</dd></div>
            <div><dt className="text-sm text-muted">Ngày sinh</dt><dd className="mt-1 font-medium">{detail.dateOfBirth ? formatDateTime(detail.dateOfBirth) : 'Chưa cập nhật'}</dd></div>
            {detail.businessType === 'HouseholdBusiness' ? <div><dt className="text-sm text-muted">Mã số đăng ký hộ kinh doanh</dt><dd className="mt-1 font-medium">{detail.businessRegistrationNumber || 'Chưa cập nhật'}</dd></div> : null}
            <div className="sm:col-span-2"><dt className="text-sm text-muted">Địa chỉ cư trú</dt><dd className="mt-1 font-medium">{detail.registeredAddress || 'Chưa cập nhật'}</dd></div>
          </> : null}
          <div><dt className="text-sm text-muted">Người liên hệ</dt><dd className="mt-1 font-medium">{detail.contactName || 'Chưa cập nhật'}</dd></div>
          <div><dt className="text-sm text-muted">Địa chỉ email</dt><dd className="mt-1 font-medium">{detail.contactEmail || 'Chưa cập nhật'}</dd></div>
          <div><dt className="text-sm text-muted">Số điện thoại</dt><dd className="mt-1 font-medium">{detail.contactPhone || 'Chưa cập nhật'}</dd></div>
          {detail.businessType !== 'Company' ? <div><dt className="text-sm text-muted">Ảnh khuôn mặt</dt><dd className="mt-1 font-medium">{hasFacePhoto ? 'Đã tải lên' : 'Chưa tải lên'}</dd></div> : null}
        </dl>
      </section>

      <section aria-labelledby="admin-documents-title" className="rounded-lg border border-border bg-white p-5 shadow-panel sm:p-6">
        <h2 id="admin-documents-title" className="text-lg font-semibold">Tài liệu xác minh ({detail.documents.length})</h2>
        {detail.documents.length ? <ul className="mt-4 space-y-2">{detail.documents.map((document) => (
          <li key={document.id} className="flex flex-col gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 gap-3"><FileText size={19} className="shrink-0 text-primary-700" aria-hidden="true" /><div className="min-w-0"><p className="font-medium">{documentLabels[document.documentType] ?? document.documentType}</p><p className="truncate text-sm text-muted">{document.originalFileName} · {Math.ceil(document.bytes / 1024)} KB · {formatDateTime(document.createdAt)}</p></div></div>
            <Button type="button" variant="secondary" className="min-h-11 shrink-0" disabled={accessMutation.isPending} onClick={() => openDocument(document.id)}><ExternalLink size={16} aria-hidden="true" />{accessMutation.isPending ? 'Đang mở...' : 'Xem riêng tư'}</Button>
          </li>
        ))}</ul> : <Alert tone="danger">Hồ sơ chưa có tài liệu xác minh.</Alert>}
      </section>

      <section aria-labelledby="admin-review-actions-title" className="rounded-lg border border-border bg-white p-5 shadow-panel sm:p-6">
        <h2 id="admin-review-actions-title" className="text-lg font-semibold">Thao tác xét duyệt</h2>
        <p className="mt-1 text-sm text-muted">Chỉ các chuyển trạng thái hợp lệ mới được hiển thị.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {['Submitted', 'UnderReview'].includes(detail.verificationStatus) ? (
            <>
              <Button type="button" variant="secondary" className="min-h-11" onClick={() => setReviewAction('revision')}>Yêu cầu bổ sung</Button>
              <Button type="button" className="min-h-11" onClick={() => setReviewAction('approve')}>Phê duyệt</Button>
              <Button type="button" variant="danger" className="min-h-11" onClick={() => setReviewAction('reject')}>Từ chối</Button>
            </>
          ) : null}
          {!['Submitted', 'UnderReview'].includes(detail.verificationStatus) ? (
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
        {reviewAction === 'approve' ? <Alert>Phê duyệt sẽ xác minh hồ sơ người bán. Hành động được ghi vào lịch sử.</Alert> : null}
        {reviewAction === 'revision' ? <Alert>Hãy nêu cụ thể thông tin hoặc tài liệu cần bổ sung. Nội dung này sẽ hiển thị trong Kênh người bán và được gửi qua email.</Alert> : null}
        {reviewAction === 'reject' ? <Alert tone="danger">Hãy nêu rõ lý do từ chối và cách xử lý nếu người bán có thể gửi lại. Nội dung này sẽ hiển thị trong Kênh người bán và được gửi qua email.</Alert> : null}
        {reviewAction === 'revision' || reviewAction === 'reject' ? (
          <Textarea
            label={reviewAction === 'revision' ? 'Nội dung cần bổ sung' : 'Lý do từ chối'}
            rows={5}
            maxLength={1000}
            value={reason}
            error={reason.length > 0 && reason.trim().length < 5 ? `${reviewAction === 'revision' ? 'Nội dung yêu cầu bổ sung' : 'Lý do từ chối'} phải có ít nhất 5 ký tự` : undefined}
            onChange={(event) => setReason(event.target.value)}
          />
        ) : null}
      </Modal>
    </div>
  );
}

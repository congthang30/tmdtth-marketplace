import { CheckCircle2, FileText, ShieldCheck, Store } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import type { SellerVerificationOverview } from '../types';

const documentLabels: Record<string, string> = {
  IdentityFront: 'Mặt trước giấy tờ định danh',
  IdentityBack: 'Mặt sau giấy tờ định danh',
  Passport: 'Hộ chiếu',
  BusinessRegistration: 'Giấy đăng ký kinh doanh',
  LegalRepresentativeIdentity: 'Giấy tờ người đại diện',
};

type SellerVerificationReviewProps = {
  overview: SellerVerificationOverview;
};

export function SellerVerificationReview({ overview }: SellerVerificationReviewProps) {
  const { shop, profile } = overview;
  if (!profile) {
    return <Alert tone="danger">Hồ sơ chưa đủ thông tin pháp lý. Hãy quay lại kiểm tra.</Alert>;
  }

  const rows = [
    { icon: Store, label: 'Gian hàng', value: shop.shopName },
    { icon: ShieldCheck, label: 'Tên pháp lý', value: profile.legalName },
    { icon: ShieldCheck, label: 'Mã số thuế', value: profile.taxCodeMasked },
    {
      icon: ShieldCheck,
      label: profile.sellerType === 'Individual' ? 'Số giấy tờ' : 'Số đăng ký kinh doanh',
      value: profile.sellerType === 'Individual'
        ? profile.identityNumberMasked
        : profile.businessRegistrationNumberMasked,
    },
  ];

  return (
    <div className="space-y-5">
      <Alert>
        Thông tin nhạy cảm chỉ hiển thị dạng che bớt. Sau khi gửi, hồ sơ sẽ khóa chỉnh sửa trong thời gian xét duyệt.
      </Alert>
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-lg border border-border p-4">
            <dt className="flex items-center gap-2 text-sm font-medium text-muted">
              <Icon size={17} aria-hidden="true" />{label}
            </dt>
            <dd className="mt-2 break-words font-semibold text-ink">{value || 'Chưa cung cấp'}</dd>
          </div>
        ))}
      </dl>
      <section aria-labelledby="review-documents-title">
        <h3 id="review-documents-title" className="flex items-center gap-2 font-semibold">
          <FileText size={18} aria-hidden="true" /> Tài liệu xác minh ({profile.documents.length})
        </h3>
        <ul className="mt-3 space-y-2">
          {profile.documents.map((document) => (
            <li key={document.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
              <CheckCircle2 size={17} className="shrink-0 text-primary-700" aria-hidden="true" />
              <span>{documentLabels[document.documentType] ?? document.documentType}</span>
              <span className="ml-auto text-muted">{document.documentStatus}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

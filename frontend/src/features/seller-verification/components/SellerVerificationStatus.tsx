import { AlertCircle, BadgeCheck, Clock3, FilePenLine, SearchCheck } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import type { SellerVerificationProfile, VerificationStatus } from '../types';

const statusContent: Record<VerificationStatus, {
  title: string;
  description: string;
  nextStep: string;
  icon: typeof Clock3;
}> = {
  Draft: {
    title: 'Hồ sơ đang ở bản nháp',
    description: 'Bạn có thể tiếp tục bổ sung và kiểm tra thông tin trước khi gửi.',
    nextStep: 'Hoàn thành các bước còn thiếu rồi gửi hồ sơ xét duyệt.',
    icon: FilePenLine,
  },
  Submitted: {
    title: 'Hồ sơ đã được gửi',
    description: 'Hệ thống đã ghi nhận hồ sơ và đang chờ quản trị viên tiếp nhận.',
    nextStep: 'Bạn chưa thể chỉnh sửa trong thời gian chờ xét duyệt.',
    icon: Clock3,
  },
  UnderReview: {
    title: 'Hồ sơ đang được xét duyệt',
    description: 'Quản trị viên đang kiểm tra thông tin pháp lý, tài khoản và tài liệu.',
    nextStep: 'Không cần gửi lại hồ sơ. Hãy quay lại theo dõi trạng thái sau.',
    icon: SearchCheck,
  },
  NeedsRevision: {
    title: 'Hồ sơ cần được bổ sung',
    description: 'Quản trị viên yêu cầu cập nhật một số thông tin trước khi xét duyệt tiếp.',
    nextStep: 'Xem nội dung phản hồi bên dưới, chỉnh sửa và gửi lại hồ sơ.',
    icon: FilePenLine,
  },
  Rejected: {
    title: 'Hồ sơ chưa được chấp thuận',
    description: 'Hồ sơ hiện không đáp ứng yêu cầu xác minh.',
    nextStep: 'Xem lý do bên dưới, cập nhật thông tin phù hợp rồi gửi lại.',
    icon: AlertCircle,
  },
  Approved: {
    title: 'Hồ sơ đã được xác minh',
    description: 'Thông tin người bán đã được quản trị viên chấp thuận.',
    nextStep: 'Gian hàng chỉ hoạt động sau khi hoàn tất bước phê duyệt gian hàng.',
    icon: BadgeCheck,
  },
  Suspended: {
    title: 'Hồ sơ đang bị tạm ngưng',
    description: 'Quyền xác minh người bán hiện đang bị tạm ngưng.',
    nextStep: 'Liên hệ bộ phận hỗ trợ để được hướng dẫn; không tự gửi lại hồ sơ.',
    icon: AlertCircle,
  },
};

type SellerVerificationStatusProps = {
  profile: SellerVerificationProfile;
};

export function SellerVerificationStatus({ profile }: SellerVerificationStatusProps) {
  const content = statusContent[profile.verificationStatus];
  const Icon = content.icon;
  const latestReview = profile.reviews[0];
  const reason = latestReview?.reason?.trim();

  return (
    <section aria-labelledby="seller-verification-status-title" className="rounded-lg border border-border bg-white p-5 shadow-panel sm:p-6">
      <div className="flex gap-3">
        <Icon size={24} className="shrink-0 text-primary-700" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-primary-700">Trạng thái hồ sơ</p>
          <h2 id="seller-verification-status-title" className="mt-1 text-xl font-semibold text-ink">{content.title}</h2>
          <p className="mt-2 text-sm text-muted">{content.description}</p>
        </div>
      </div>
      <Alert className="mt-5">{content.nextStep}</Alert>
      {(profile.verificationStatus === 'NeedsRevision' || profile.verificationStatus === 'Rejected') ? (
        <div className="mt-5 rounded-lg border border-border p-4">
          <h3 className="font-semibold text-ink">Phản hồi từ quản trị viên</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted">
            {reason || 'Chưa có nội dung phản hồi chi tiết. Vui lòng liên hệ bộ phận hỗ trợ.'}
          </p>
        </div>
      ) : null}
      {profile.submittedAt ? (
        <p className="mt-4 text-xs text-muted">
          Gửi lúc {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(profile.submittedAt))}
        </p>
      ) : null}
    </section>
  );
}

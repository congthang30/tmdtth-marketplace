import { BadRequestException, Injectable } from '@nestjs/common';
import { VerificationStatus } from '@prisma/client';

export const VERIFICATION_TRANSITIONS: Readonly<
  Record<VerificationStatus, readonly VerificationStatus[]>
> = {
  Draft: [VerificationStatus.Submitted],
  Submitted: [VerificationStatus.UnderReview],
  UnderReview: [
    VerificationStatus.NeedsRevision,
    VerificationStatus.Approved,
    VerificationStatus.Rejected,
  ],
  NeedsRevision: [VerificationStatus.Submitted],
  Approved: [VerificationStatus.Suspended],
  Rejected: [VerificationStatus.Submitted],
  Suspended: [VerificationStatus.UnderReview],
};

@Injectable()
export class VerificationTransitionService {
  canTransition(from: VerificationStatus, to: VerificationStatus): boolean {
    return VERIFICATION_TRANSITIONS[from].includes(to);
  }

  assertAllowed(from: VerificationStatus, to: VerificationStatus): void {
    if (this.canTransition(from, to)) {
      return;
    }

    throw new BadRequestException({
      code: 'SELLER_VERIFICATION_TRANSITION_INVALID',
      message: 'Không thể chuyển hồ sơ sang trạng thái được yêu cầu.',
      details: [{ field: 'verificationStatus', from, to }],
    });
  }
}

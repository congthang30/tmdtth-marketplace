import { ReviewStatus, VerificationStatus } from '@prisma/client';
import { AdminSellerVerificationService } from './admin-seller-verification.service';
import { VerificationTransitionService } from './verification-transition.service';

describe('AdminSellerVerificationService moderation lifecycle', () => {
  const admin = { id: 99n, email: 'admin@example.com', roles: [] } as never;
  const nowProfile = {
    id: 11n,
    shopId: 22n,
    verificationStatus: VerificationStatus.Submitted,
    contactEmail: 'seller@example.com',
    contactName: 'Nguyen Van A',
    legalName: 'Nguyen Van A',
    shop: { shopName: 'Nong San Xanh', ownerUserId: 7n },
  };

  function setup() {
    const transaction = {
      sellerVerificationProfile: {
        update: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ ...nowProfile, ...data }),
          ),
      },
      sellerVerificationReview: { create: jest.fn().mockResolvedValue({}) },
      sellerVerificationHistory: { create: jest.fn().mockResolvedValue({}) },
      sellerVerificationDocument: {
        updateMany: jest.fn().mockResolvedValue({ count: 3 }),
      },
      shop: { update: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      sellerVerificationProfile: {
        findUnique: jest.fn().mockResolvedValue(nowProfile),
      },
      $transaction: jest
        .fn()
        .mockImplementation((callback) => callback(transaction)),
    };
    const emailService = {
      sendApproved: jest.fn().mockResolvedValue(undefined),
      sendRevisionRequested: jest.fn().mockResolvedValue(undefined),
      sendRejected: jest.fn().mockResolvedValue(undefined),
    };
    const service = new AdminSellerVerificationService(
      prisma as never,
      {} as never,
      {} as never,
      new VerificationTransitionService(),
      emailService as never,
    );
    return { service, transaction, emailService };
  }

  it('approves profile and shop atomically', async () => {
    const { service, transaction, emailService } = setup();

    await service.approve(admin, '11');

    expect(transaction.sellerVerificationProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          verificationStatus: VerificationStatus.Approved,
        }),
      }),
    );
    expect(transaction.shop.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          shopStatus: 'Approved',
          approvedByUserId: 99n,
          rejectionReason: null,
        }),
      }),
    );
    expect(transaction.sellerVerificationReview.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reviewStatus: ReviewStatus.Approved }),
      }),
    );
    expect(
      transaction.sellerVerificationDocument.updateMany,
    ).toHaveBeenCalledWith({
      where: { verificationProfileId: 11n, isDeleted: false },
      data: { documentStatus: 'Accepted', updatedAt: expect.any(Date) },
    });
    expect(emailService.sendApproved).toHaveBeenCalledTimes(1);
  });

  it('returns shop to Draft and notifies the seller when revision is requested', async () => {
    const { service, transaction, emailService } = setup();
    const reason = 'Vui lòng bổ sung giấy tờ.';

    await service.requestRevision(admin, '11', { reason });

    expect(transaction.shop.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          shopStatus: 'Draft',
          approvedAt: null,
          approvedByUserId: null,
          rejectionReason: reason,
        }),
      }),
    );
    expect(emailService.sendRevisionRequested).toHaveBeenCalledWith(
      'seller@example.com',
      'Nguyen Van A',
      'Nong San Xanh',
      reason,
    );
  });

  it('rejects the shop and notifies the seller with the reason', async () => {
    const { service, transaction, emailService } = setup();
    const reason = 'Thông tin pháp lý không khớp.';

    await service.reject(admin, '11', { reason });

    expect(transaction.shop.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          shopStatus: 'Rejected',
          rejectionReason: reason,
        }),
      }),
    );
    expect(emailService.sendRejected).toHaveBeenCalledWith(
      'seller@example.com',
      'Nguyen Van A',
      'Nong San Xanh',
      reason,
    );
  });
});

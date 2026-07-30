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
    type DataArgs = { data: Record<string, unknown> };
    const updateProfile = jest.fn<
      Promise<typeof nowProfile & Record<string, unknown>>,
      [DataArgs]
    >(({ data }) => Promise.resolve({ ...nowProfile, ...data }));
    const transaction = {
      sellerVerificationProfile: { update: updateProfile },
      sellerVerificationReview: {
        create: jest.fn<Promise<unknown>, [DataArgs]>().mockResolvedValue({}),
      },
      sellerVerificationHistory: {
        create: jest.fn<Promise<unknown>, [DataArgs]>().mockResolvedValue({}),
      },
      sellerVerificationDocument: {
        updateMany: jest
          .fn<
            Promise<{ count: number }>,
            [DataArgs & Record<string, unknown>]
          >()
          .mockResolvedValue({ count: 3 }),
      },
      shop: {
        update: jest.fn<Promise<unknown>, [DataArgs]>().mockResolvedValue({}),
      },
    };
    const prisma = {
      sellerVerificationProfile: {
        findUnique: jest.fn().mockResolvedValue(nowProfile),
      },
      $transaction: jest.fn(
        (callback: (tx: typeof transaction) => Promise<unknown>) =>
          callback(transaction),
      ),
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

    const profileUpdate = transaction.sellerVerificationProfile.update.mock
      .calls[0][0] as { data: { verificationStatus: VerificationStatus } };
    const shopUpdate = transaction.shop.update.mock.calls[0][0] as {
      data: {
        shopStatus: string;
        approvedByUserId: bigint;
        rejectionReason: null;
      };
    };
    const reviewCreate = transaction.sellerVerificationReview.create.mock
      .calls[0][0] as { data: { reviewStatus: ReviewStatus } };
    const documentUpdate = transaction.sellerVerificationDocument.updateMany
      .mock.calls[0][0] as {
      where: { verificationProfileId: bigint; isDeleted: boolean };
      data: { documentStatus: string; updatedAt: Date };
    };
    expect(profileUpdate.data.verificationStatus).toBe(
      VerificationStatus.Approved,
    );
    expect(shopUpdate.data).toMatchObject({
      shopStatus: 'Approved',
      approvedByUserId: 99n,
      rejectionReason: null,
    });
    expect(reviewCreate.data.reviewStatus).toBe(ReviewStatus.Approved);
    expect(documentUpdate.where).toEqual({
      verificationProfileId: 11n,
      isDeleted: false,
    });
    expect(documentUpdate.data.documentStatus).toBe('Accepted');
    expect(documentUpdate.data.updatedAt).toBeInstanceOf(Date);
    expect(emailService.sendApproved).toHaveBeenCalledTimes(1);
  });

  it('returns shop to Draft and notifies the seller when revision is requested', async () => {
    const { service, transaction, emailService } = setup();
    const reason = 'Vui lòng bổ sung giấy tờ.';

    await service.requestRevision(admin, '11', { reason });

    const shopUpdate = transaction.shop.update.mock.calls[0][0] as {
      data: {
        shopStatus: string;
        approvedAt: null;
        approvedByUserId: null;
        rejectionReason: string;
      };
    };
    expect(shopUpdate.data).toMatchObject({
      shopStatus: 'Draft',
      approvedAt: null,
      approvedByUserId: null,
      rejectionReason: reason,
    });
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

    const shopUpdate = transaction.shop.update.mock.calls[0][0] as {
      data: { shopStatus: string; rejectionReason: string };
    };
    expect(shopUpdate.data).toMatchObject({
      shopStatus: 'Rejected',
      rejectionReason: reason,
    });
    expect(emailService.sendRejected).toHaveBeenCalledWith(
      'seller@example.com',
      'Nguyen Van A',
      'Nong San Xanh',
      reason,
    );
  });
});

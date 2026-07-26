import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PayoutStatus,
  ReviewStatus,
  SellerDocumentAccessRole,
  VerificationStatus,
} from '@prisma/client';
import { getSellerDocumentSignedUrlTtlSeconds } from '../../config/seller-verification.config';
import {
  createPaginatedResult,
  getPaginationParams,
} from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/types';
import {
  AdminSellerVerificationQueryDto,
  ReviewReasonDto,
} from './dto/admin-seller-verification.dto';
import { SellerDataCryptoService } from './seller-data-crypto.service';
import { SellerDocumentStorageService } from './seller-document-storage.service';
import { DocumentAccessContext } from './types';
import { VerificationTransitionService } from './verification-transition.service';

@Injectable()
export class AdminSellerVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: SellerDataCryptoService,
    private readonly storage: SellerDocumentStorageService,
    private readonly transitions: VerificationTransitionService,
  ) {}

  async list(query: AdminSellerVerificationQueryDto) {
    const { page, limit, skip, take } = getPaginationParams(query);
    const q = query.q?.trim();
    const where = {
      ...(query.status ? { verificationStatus: query.status } : {}),
      ...(query.sellerType ? { sellerType: query.sellerType } : {}),
      ...(q
        ? {
            OR: [
              { legalName: { contains: q, mode: 'insensitive' as const } },
              {
                shop: {
                  shopName: { contains: q, mode: 'insensitive' as const },
                },
              },
            ],
          }
        : {}),
      shop: { isDeleted: false },
    };
    const orderBy = { [query.sortBy]: query.sortOrder };
    const [profiles, total] = await Promise.all([
      this.prisma.sellerVerificationProfile.findMany({
        where,
        include: {
          shop: { select: { id: true, shopName: true, shopStatus: true } },
          _count: { select: { documents: true } },
        },
        orderBy,
        skip,
        take,
      }),
      this.prisma.sellerVerificationProfile.count({ where }),
    ]);

    return createPaginatedResult({
      items: profiles.map((profile) => ({
        id: profile.id.toString(),
        shop: {
          id: profile.shop.id.toString(),
          shopName: profile.shop.shopName,
          shopStatus: profile.shop.shopStatus,
        },
        sellerType: profile.sellerType,
        businessType: profile.businessType,
        legalName: profile.legalName,
        taxCodeMasked: this.crypto.mask(profile.taxCodeLast4),
        verificationStatus: profile.verificationStatus,
        submittedAt: profile.submittedAt,
        createdAt: profile.createdAt,
        documentCount: profile._count.documents,
      })),
      page,
      limit,
      total,
      message: 'Danh sách hồ sơ xác minh đã được tải.',
    });
  }

  async detail(profileId: string) {
    const id = this.parseId(profileId);
    const profile = await this.prisma.sellerVerificationProfile.findUnique({
      where: { id },
      include: {
        shop: { select: { id: true, shopName: true, shopStatus: true } },
        documents: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'asc' },
        },
        reviews: { orderBy: { createdAt: 'desc' } },
        histories: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!profile || profile.shop.shopStatus === 'Deleted') {
      throw this.notFound();
    }
    const payout = await this.prisma.sellerPayoutAccount.findUnique({
      where: { shopId: profile.shopId },
    });

    return {
      id: profile.id.toString(),
      shop: { ...profile.shop, id: profile.shop.id.toString() },
      sellerType: profile.sellerType,
      businessType: profile.businessType,
      legalName: profile.legalName,
      identityDocumentType: profile.identityDocumentType,
      identityNumberMasked: this.crypto.mask(profile.identityNumberLast4),
      identityIssuedAt: profile.identityIssuedAt,
      identityIssuedBy: profile.identityIssuedBy,
      identityExpiresAt: profile.identityExpiresAt,
      taxCodeMasked: this.crypto.mask(profile.taxCodeLast4),
      businessRegistrationNumberMasked: this.crypto.mask(
        profile.businessRegistrationNumberLast4,
      ),
      businessRegistrationIssuedAt: profile.businessRegistrationIssuedAt,
      businessRegistrationIssuedBy: profile.businessRegistrationIssuedBy,
      legalRepresentativeName: profile.legalRepresentativeName,
      registeredAddress: profile.registeredAddress,
      verificationStatus: profile.verificationStatus,
      submittedAt: profile.submittedAt,
      reviewedAt: profile.reviewedAt,
      payoutAccount: payout
        ? {
            bankCode: payout.bankCode,
            bankName: payout.bankNameSnapshot,
            accountNumberMasked: this.crypto.mask(payout.accountNumberLast4),
            accountHolderName: payout.accountHolderName,
            payoutStatus: payout.payoutStatus,
          }
        : null,
      documents: profile.documents.map((document) => ({
        id: document.id.toString(),
        verificationProfileId: document.verificationProfileId.toString(),
        documentType: document.documentType,
        storageProvider: document.storageProvider,
        deliveryType: document.deliveryType,
        resourceType: document.resourceType,
        format: document.format,
        mimeType: document.mimeType,
        originalFileName: document.originalFileName,
        bytes: document.bytes,
        checksum: document.checksum,
        documentStatus: document.documentStatus,
        expiresAt: document.expiresAt,
        uploadedByUserId: document.uploadedByUserId.toString(),
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      })),
      reviews: profile.reviews.map((review) => ({
        ...review,
        id: review.id.toString(),
        verificationProfileId: review.verificationProfileId.toString(),
        reviewerUserId: review.reviewerUserId.toString(),
      })),
      histories: profile.histories.map((history) => ({
        ...history,
        id: history.id.toString(),
        verificationProfileId: history.verificationProfileId.toString(),
        changedByUserId: history.changedByUserId.toString(),
      })),
    };
  }

  async accessDocument(
    user: AuthenticatedUser,
    profileId: string,
    documentId: string,
    context: DocumentAccessContext,
  ) {
    const profile = this.parseId(profileId);
    const document = await this.prisma.sellerVerificationDocument.findFirst({
      where: {
        id: this.parseId(documentId),
        verificationProfileId: profile,
        isDeleted: false,
        verificationProfile: { shop: { isDeleted: false } },
      },
    });
    if (!document) throw this.notFound();
    await this.prisma.sellerDocumentAccessAudit.create({
      data: {
        documentId: document.id,
        actorUserId: user.id,
        accessRole: SellerDocumentAccessRole.Admin,
        purpose: 'Admin seller verification review',
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        signedUrlTtl: getSellerDocumentSignedUrlTtlSeconds(),
      },
    });
    return this.storage.signedUrl(document);
  }

  startReview(user: AuthenticatedUser, profileId: string) {
    return this.transition(
      user,
      profileId,
      VerificationStatus.UnderReview,
      ReviewStatus.InProgress,
    );
  }

  requestRevision(
    user: AuthenticatedUser,
    profileId: string,
    dto: ReviewReasonDto,
  ) {
    return this.transition(
      user,
      profileId,
      VerificationStatus.NeedsRevision,
      ReviewStatus.NeedsRevision,
      dto.reason,
    );
  }

  approve(user: AuthenticatedUser, profileId: string) {
    return this.transition(
      user,
      profileId,
      VerificationStatus.Approved,
      ReviewStatus.Approved,
    );
  }

  reject(user: AuthenticatedUser, profileId: string, dto: ReviewReasonDto) {
    return this.transition(
      user,
      profileId,
      VerificationStatus.Rejected,
      ReviewStatus.Rejected,
      dto.reason,
    );
  }

  private async transition(
    user: AuthenticatedUser,
    profileId: string,
    toStatus: VerificationStatus,
    reviewStatus: ReviewStatus,
    reason?: string,
  ) {
    const id = this.parseId(profileId);
    const profile = await this.prisma.sellerVerificationProfile.findUnique({
      where: { id },
    });
    if (!profile) throw this.notFound();
    this.transitions.assertAllowed(profile.verificationStatus, toStatus);
    const now = new Date();

    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.sellerVerificationProfile.update({
        where: { id },
        data: {
          verificationStatus: toStatus,
          reviewedByUserId: user.id,
          reviewedAt: now,
          updatedAt: now,
        },
      });
      await transaction.sellerVerificationReview.create({
        data: {
          verificationProfileId: id,
          reviewStatus,
          fromStatus: profile.verificationStatus,
          toStatus,
          reason,
          reviewerUserId: user.id,
          createdAt: now,
        },
      });
      await transaction.sellerVerificationHistory.create({
        data: {
          verificationProfileId: id,
          fromStatus: profile.verificationStatus,
          toStatus,
          reason,
          changedByUserId: user.id,
          createdAt: now,
        },
      });
      if (toStatus === VerificationStatus.Approved) {
        await transaction.sellerPayoutAccount.updateMany({
          where: { shopId: profile.shopId, isActive: true },
          data: {
            payoutStatus: PayoutStatus.Verified,
            verifiedAt: now,
            verifiedByUserId: user.id,
            updatedAt: now,
          },
        });
      } else if (
        toStatus === VerificationStatus.NeedsRevision ||
        toStatus === VerificationStatus.Rejected
      ) {
        await transaction.sellerPayoutAccount.updateMany({
          where: { shopId: profile.shopId, isActive: true },
          data: {
            payoutStatus: PayoutStatus.Rejected,
            verifiedAt: null,
            verifiedByUserId: user.id,
            updatedAt: now,
          },
        });
      }
      return {
        id: updated.id.toString(),
        verificationStatus: updated.verificationStatus,
        reviewedAt: updated.reviewedAt,
      };
    });
  }

  private parseId(value: string): bigint {
    if (!/^\d+$/.test(value)) {
      throw new BadRequestException({
        code: 'SELLER_VERIFICATION_ID_INVALID',
        message: 'Mã hồ sơ xác minh không hợp lệ.',
        details: [{ field: 'profileId' }],
      });
    }
    return BigInt(value);
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      code: 'SELLER_VERIFICATION_NOT_FOUND',
      message: 'Không tìm thấy hồ sơ xác minh.',
      details: [],
    });
  }
}

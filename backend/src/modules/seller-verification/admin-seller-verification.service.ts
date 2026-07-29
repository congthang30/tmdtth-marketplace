import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
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
import { SellerVerificationEmailService } from './seller-verification-email.service';
import { VerificationTransitionService } from './verification-transition.service';

@Injectable()
export class AdminSellerVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: SellerDataCryptoService,
    private readonly storage: SellerDocumentStorageService,
    private readonly transitions: VerificationTransitionService,
    private readonly emailService: SellerVerificationEmailService,
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
          shop: { select: { id: true, shopName: true, shopStatus: true, province: true, ward: true, streetAddress: true } },
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
        shop: { select: { id: true, shopName: true, shopStatus: true, province: true, ward: true, streetAddress: true } },
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

    return {
      id: profile.id.toString(),
      shop: { ...profile.shop, id: profile.shop.id.toString() },
      sellerType: profile.sellerType,
      businessType: profile.businessType,
      legalName: profile.legalName,
      identityDocumentType: profile.identityDocumentType,
      identityNumber: profile.identityNumberEncrypted
        ? this.crypto.decrypt(profile.identityNumberEncrypted)
        : null,
      identityIssuedAt: profile.identityIssuedAt,
      identityIssuedBy: profile.identityIssuedBy,
      identityExpiresAt: profile.identityExpiresAt,
      taxCode: profile.taxCodeEncrypted
        ? this.crypto.decrypt(profile.taxCodeEncrypted)
        : null,
      businessRegistrationNumber: profile.businessRegistrationNumberEncrypted
        ? this.crypto.decrypt(profile.businessRegistrationNumberEncrypted)
        : null,
      businessRegistrationIssuedAt: profile.businessRegistrationIssuedAt,
      businessRegistrationIssuedBy: profile.businessRegistrationIssuedBy,
      legalRepresentativeName: profile.legalRepresentativeName,
      registeredAddress: profile.registeredAddress,
      dateOfBirth: profile.dateOfBirth,
      contactName: profile.contactName,
      contactEmail: profile.contactEmail,
      contactPhone: profile.contactPhone,
      useAccountPhone: profile.useAccountPhone,
      faceVerified: profile.faceVerified,
      verificationStatus: profile.verificationStatus,
      submittedAt: profile.submittedAt,
      reviewedAt: profile.reviewedAt,

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
      include: { shop: { select: { shopName: true, ownerUserId: true } } },
    });
    if (!profile) throw this.notFound();
    this.transitions.assertAllowed(profile.verificationStatus, toStatus);
    const now = new Date();

    const result = await this.prisma.$transaction(async (transaction) => {
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
        await transaction.sellerVerificationDocument.updateMany({
          where: { verificationProfileId: id, isDeleted: false },
          data: { documentStatus: 'Accepted', updatedAt: now },
        });
        await transaction.shop.update({ where: { id: profile.shopId }, data: { shopStatus: 'Approved', approvedByUserId: user.id, approvedAt: now, rejectionReason: null, updatedAt: now } });
      } else if (toStatus === VerificationStatus.NeedsRevision) {
        await transaction.shop.update({ where: { id: profile.shopId }, data: { shopStatus: 'Draft', approvedByUserId: null, approvedAt: null, rejectionReason: reason ?? null, updatedAt: now } });
      } else if (toStatus === VerificationStatus.Rejected) {
        await transaction.shop.update({ where: { id: profile.shopId }, data: { shopStatus: 'Rejected', approvedByUserId: null, approvedAt: null, rejectionReason: reason ?? null, updatedAt: now } });
      }
      return {
        id: updated.id.toString(),
        verificationStatus: updated.verificationStatus,
        reviewedAt: updated.reviewedAt,
      };
    });
    if (profile.contactEmail) {
      const recipientName = profile.contactName ?? profile.legalName;
      if (toStatus === VerificationStatus.Approved) {
        await this.emailService.sendApproved(profile.contactEmail, recipientName, profile.shop.shopName);
      } else if (toStatus === VerificationStatus.NeedsRevision && reason) {
        await this.emailService.sendRevisionRequested(profile.contactEmail, recipientName, profile.shop.shopName, reason);
      } else if (toStatus === VerificationStatus.Rejected && reason) {
        await this.emailService.sendRejected(profile.contactEmail, recipientName, profile.shop.shopName, reason);
      }
    }
    return result;
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

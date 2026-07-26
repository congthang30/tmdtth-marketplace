import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PayoutStatus,
  SellerDocumentAccessRole,
  SellerDocumentType,
  SellerType,
  VerificationStatus,
} from '@prisma/client';
import { getSellerDocumentSignedUrlTtlSeconds } from '../../config/seller-verification.config';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/types';
import {
  SaveSellerPayoutAccountDto,
  SaveSellerVerificationDto,
} from './dto/save-seller-verification.dto';
import { SellerDataCryptoService } from './seller-data-crypto.service';
import { SellerDocumentStorageService } from './seller-document-storage.service';
import { SellerDocumentValidatorService } from './seller-document-validator.service';
import { DocumentAccessContext } from './types';
import { VerificationTransitionService } from './verification-transition.service';

const EDITABLE_STATUSES: VerificationStatus[] = [
  VerificationStatus.Draft,
  VerificationStatus.NeedsRevision,
  VerificationStatus.Rejected,
];

@Injectable()
export class SellerVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: SellerDataCryptoService,
    private readonly storage: SellerDocumentStorageService,
    private readonly documentValidator: SellerDocumentValidatorService,
    private readonly transitions: VerificationTransitionService,
  ) {}

  async getMine(user: AuthenticatedUser) {
    const shop = await this.findOwnedShop(user.id);
    const profile = await this.prisma.sellerVerificationProfile.findUnique({
      where: { shopId: shop.id },
      include: {
        documents: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'asc' },
        },
        reviews: { orderBy: { createdAt: 'desc' } },
      },
    });
    const payout = await this.prisma.sellerPayoutAccount.findUnique({
      where: { shopId: shop.id },
    });

    return {
      shop: {
        id: shop.id.toString(),
        shopName: shop.shopName,
        shopStatus: shop.shopStatus,
      },
      profile: profile ? this.toProfileResponse(profile) : null,
      payoutAccount: payout ? this.toPayoutResponse(payout) : null,
    };
  }

  async saveMine(user: AuthenticatedUser, dto: SaveSellerVerificationDto) {
    const shop = await this.findOwnedShop(user.id);
    const existing = await this.prisma.sellerVerificationProfile.findUnique({
      where: { shopId: shop.id },
    });

    if (existing && !EDITABLE_STATUSES.includes(existing.verificationStatus)) {
      throw new ConflictException({
        code: 'SELLER_VERIFICATION_NOT_EDITABLE',
        message: 'Hồ sơ đang được xét duyệt hoặc đã được duyệt.',
        details: [
          {
            field: 'verificationStatus',
            currentStatus: existing.verificationStatus,
          },
        ],
      });
    }

    this.assertDates(dto);
    const now = new Date();
    const data = {
      sellerType: dto.sellerType,
      businessType:
        dto.sellerType === SellerType.Business ? dto.businessType : null,
      legalName: dto.legalName,
      identityDocumentType:
        dto.sellerType === SellerType.Individual
          ? dto.identityDocumentType
          : null,
      identityNumberEncrypted: dto.identityNumber
        ? this.crypto.encrypt(dto.identityNumber)
        : null,
      identityNumberHash: dto.identityNumber
        ? this.crypto.hash(dto.identityNumber)
        : null,
      identityNumberLast4: dto.identityNumber
        ? this.crypto.last4(dto.identityNumber)
        : null,
      identityIssuedAt: this.toDate(dto.identityIssuedAt),
      identityIssuedBy: dto.identityIssuedBy ?? null,
      identityExpiresAt: this.toDate(dto.identityExpiresAt),
      taxCodeEncrypted: this.crypto.encrypt(dto.taxCode),
      taxCodeHash: this.crypto.hash(dto.taxCode),
      taxCodeLast4: this.crypto.last4(dto.taxCode),
      businessRegistrationNumberEncrypted: dto.businessRegistrationNumber
        ? this.crypto.encrypt(dto.businessRegistrationNumber)
        : null,
      businessRegistrationNumberHash: dto.businessRegistrationNumber
        ? this.crypto.hash(dto.businessRegistrationNumber)
        : null,
      businessRegistrationNumberLast4: dto.businessRegistrationNumber
        ? this.crypto.last4(dto.businessRegistrationNumber)
        : null,
      businessRegistrationIssuedAt: this.toDate(
        dto.businessRegistrationIssuedAt,
      ),
      businessRegistrationIssuedBy: dto.businessRegistrationIssuedBy ?? null,
      legalRepresentativeName: dto.legalRepresentativeName ?? null,
      registeredAddress: dto.registeredAddress ?? null,
      verificationStatus: VerificationStatus.Draft,
      submittedAt: null,
      reviewedAt: null,
      reviewedByUserId: null,
      updatedAt: now,
    };

    try {
      const profile = existing
        ? await this.prisma.sellerVerificationProfile.update({
            where: { id: existing.id },
            data,
          })
        : await this.prisma.sellerVerificationProfile.create({
            data: { ...data, shopId: shop.id, createdAt: now },
          });
      return this.toProfileResponse(profile);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException({
          code: 'SELLER_LEGAL_DATA_ALREADY_USED',
          message: 'Thông tin định danh hoặc mã số thuế đã được sử dụng.',
          details: [],
        });
      }
      throw error;
    }
  }

  async savePayout(user: AuthenticatedUser, dto: SaveSellerPayoutAccountDto) {
    const shop = await this.findOwnedShop(user.id);
    const profile = await this.prisma.sellerVerificationProfile.findUnique({
      where: { shopId: shop.id },
    });
    if (!profile || !EDITABLE_STATUSES.includes(profile.verificationStatus)) {
      throw new ConflictException({
        code: 'SELLER_VERIFICATION_NOT_EDITABLE',
        message:
          'Hãy tạo hồ sơ có thể chỉnh sửa trước khi lưu tài khoản nhận tiền.',
        details: [],
      });
    }

    const now = new Date();
    const account = await this.prisma.sellerPayoutAccount.upsert({
      where: { shopId: shop.id },
      create: {
        shopId: shop.id,
        bankCode: dto.bankCode,
        bankNameSnapshot: dto.bankName,
        accountNumberEncrypted: this.crypto.encrypt(dto.accountNumber),
        accountNumberHash: this.crypto.hash(dto.accountNumber),
        accountNumberLast4: this.crypto.last4(dto.accountNumber),
        accountHolderName: dto.accountHolderName,
        createdAt: now,
      },
      update: {
        bankCode: dto.bankCode,
        bankNameSnapshot: dto.bankName,
        accountNumberEncrypted: this.crypto.encrypt(dto.accountNumber),
        accountNumberHash: this.crypto.hash(dto.accountNumber),
        accountNumberLast4: this.crypto.last4(dto.accountNumber),
        accountHolderName: dto.accountHolderName,
        payoutStatus: PayoutStatus.Draft,
        verifiedAt: null,
        verifiedByUserId: null,
        isActive: true,
        updatedAt: now,
      },
    });
    return this.toPayoutResponse(account);
  }

  async submitMine(user: AuthenticatedUser) {
    const shop = await this.findOwnedShop(user.id);
    const profile = await this.prisma.sellerVerificationProfile.findUnique({
      where: { shopId: shop.id },
      include: { documents: { where: { isDeleted: false } } },
    });
    const payout = await this.prisma.sellerPayoutAccount.findUnique({
      where: { shopId: shop.id },
    });

    if (!profile || !EDITABLE_STATUSES.includes(profile.verificationStatus)) {
      throw new ConflictException({
        code: 'SELLER_VERIFICATION_NOT_SUBMITTABLE',
        message: 'Hồ sơ không ở trạng thái có thể gửi xét duyệt.',
        details: [],
      });
    }
    if (!payout) {
      throw new BadRequestException({
        code: 'SELLER_PAYOUT_REQUIRED',
        message: 'Hãy thêm tài khoản nhận tiền trước khi gửi hồ sơ.',
        details: [{ field: 'payoutAccount' }],
      });
    }

    const requiredDocuments =
      profile.sellerType === SellerType.Individual
        ? profile.identityDocumentType === 'Passport'
          ? [SellerDocumentType.Passport, SellerDocumentType.BankAccountProof]
          : [
              SellerDocumentType.IdentityFront,
              SellerDocumentType.IdentityBack,
              SellerDocumentType.BankAccountProof,
            ]
        : [
            SellerDocumentType.BusinessRegistration,
            SellerDocumentType.BankAccountProof,
          ];
    const uploadedTypes = new Set(
      profile.documents.map((item) => item.documentType),
    );
    const missing = requiredDocuments.filter(
      (type) => !uploadedTypes.has(type),
    );
    if (missing.length > 0) {
      throw new BadRequestException({
        code: 'SELLER_DOCUMENTS_REQUIRED',
        message: 'Hồ sơ còn thiếu tài liệu bắt buộc.',
        details: missing.map((documentType) => ({
          field: 'documents',
          documentType,
        })),
      });
    }

    this.transitions.assertAllowed(
      profile.verificationStatus,
      VerificationStatus.Submitted,
    );
    const now = new Date();
    const updated = await this.prisma.$transaction(async (transaction) => {
      const result = await transaction.sellerVerificationProfile.update({
        where: { id: profile.id },
        data: {
          verificationStatus: VerificationStatus.Submitted,
          submittedAt: now,
          updatedAt: now,
        },
      });
      await transaction.sellerVerificationHistory.create({
        data: {
          verificationProfileId: profile.id,
          fromStatus: profile.verificationStatus,
          toStatus: VerificationStatus.Submitted,
          changedByUserId: user.id,
          createdAt: now,
        },
      });
      return result;
    });
    return this.toProfileResponse(updated);
  }

  async uploadDocument(
    user: AuthenticatedUser,
    documentType: SellerDocumentType,
    file: Express.Multer.File,
  ) {
    this.documentValidator.validate(file);
    const shop = await this.findOwnedShop(user.id);
    const profile = await this.prisma.sellerVerificationProfile.findUnique({
      where: { shopId: shop.id },
    });
    if (!profile || !EDITABLE_STATUSES.includes(profile.verificationStatus)) {
      throw new ConflictException({
        code: 'SELLER_VERIFICATION_NOT_EDITABLE',
        message: 'Hồ sơ không ở trạng thái cho phép thay đổi tài liệu.',
        details: [],
      });
    }
    const checksum = this.crypto.checksum(file.buffer);
    const duplicate = await this.prisma.sellerVerificationDocument.findFirst({
      where: {
        verificationProfileId: profile.id,
        documentType,
        checksum,
        isDeleted: false,
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException({
        code: 'SELLER_DOCUMENT_DUPLICATE',
        message: 'Tài liệu này đã được tải lên cho loại giấy tờ đã chọn.',
        details: [{ field: 'file', documentType }],
      });
    }

    const asset = await this.storage.upload(file);
    try {
      const document = await this.prisma.sellerVerificationDocument.create({
        data: {
          verificationProfileId: profile.id,
          documentType,
          storageProvider: 'Cloudinary',
          storagePublicId: asset.publicId,
          deliveryType: asset.deliveryType,
          resourceType: asset.resourceType,
          format: asset.format,
          mimeType: file.mimetype,
          originalFileName: this.safeFileName(file.originalname),
          bytes: asset.bytes,
          checksum: asset.checksum,
          uploadedByUserId: user.id,
        },
      });
      return this.toDocumentResponse(document);
    } catch (error) {
      await this.storage.delete({
        storagePublicId: asset.publicId,
        resourceType: asset.resourceType,
      });
      throw error;
    }
  }

  async accessMyDocument(
    user: AuthenticatedUser,
    documentId: string,
    context: DocumentAccessContext,
  ) {
    const shop = await this.findOwnedShop(user.id);
    const document = await this.findOwnedDocument(shop.id, documentId);
    await this.prisma.sellerDocumentAccessAudit.create({
      data: {
        documentId: document.id,
        actorUserId: user.id,
        accessRole: SellerDocumentAccessRole.Owner,
        purpose: 'Owner verification document review',
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        signedUrlTtl: getSellerDocumentSignedUrlTtlSeconds(),
      },
    });
    return this.storage.signedUrl(document);
  }

  async deleteMyDocument(user: AuthenticatedUser, documentId: string) {
    const shop = await this.findOwnedShop(user.id);
    const document = await this.findOwnedDocument(shop.id, documentId);
    const profile =
      await this.prisma.sellerVerificationProfile.findUniqueOrThrow({
        where: { id: document.verificationProfileId },
      });
    if (!EDITABLE_STATUSES.includes(profile.verificationStatus)) {
      throw new ConflictException({
        code: 'SELLER_VERIFICATION_NOT_EDITABLE',
        message: 'Không thể xóa tài liệu khi hồ sơ đang được xét duyệt.',
        details: [],
      });
    }
    await this.storage.delete(document);
    await this.prisma.sellerVerificationDocument.update({
      where: { id: document.id },
      data: { isDeleted: true, deletedAt: new Date(), updatedAt: new Date() },
    });
    return { deleted: true };
  }

  private async findOwnedDocument(shopId: bigint, documentId: string) {
    const id = this.parseId(documentId, 'documentId');
    const document = await this.prisma.sellerVerificationDocument.findFirst({
      where: {
        id,
        isDeleted: false,
        verificationProfile: { shopId },
      },
    });
    if (!document) {
      throw new NotFoundException({
        code: 'SELLER_DOCUMENT_NOT_FOUND',
        message: 'Không tìm thấy tài liệu xác minh.',
        details: [],
      });
    }
    return document;
  }

  private parseId(value: string, field: string): bigint {
    if (!/^\d+$/.test(value)) {
      throw new BadRequestException({
        code: 'SELLER_DOCUMENT_ID_INVALID',
        message: 'Mã tài liệu không hợp lệ.',
        details: [{ field }],
      });
    }
    return BigInt(value);
  }

  private safeFileName(value: string): string {
    return value.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 255);
  }

  private toDocumentResponse(document: Record<string, unknown>) {
    return {
      id: String(document.id),
      documentType: document.documentType,
      mimeType: document.mimeType,
      originalFileName: document.originalFileName,
      bytes: document.bytes,
      documentStatus: document.documentStatus,
      createdAt: document.createdAt,
    };
  }

  private async findOwnedShop(userId: bigint) {
    const shop = await this.prisma.shop.findFirst({
      where: { ownerUserId: userId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
    });
    if (!shop) {
      throw new NotFoundException({
        code: 'SHOP_NOT_FOUND',
        message: 'Hãy tạo thông tin gian hàng trước.',
        details: [],
      });
    }
    return shop;
  }

  private assertDates(dto: SaveSellerVerificationDto): void {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const issuedDates = [dto.identityIssuedAt, dto.businessRegistrationIssuedAt]
      .filter(Boolean)
      .map((value) => new Date(value as string));
    if (issuedDates.some((date) => date > today)) {
      throw new BadRequestException({
        code: 'SELLER_DOCUMENT_ISSUED_IN_FUTURE',
        message: 'Ngày cấp giấy tờ không được ở tương lai.',
        details: [],
      });
    }
    if (
      dto.identityExpiresAt &&
      dto.identityIssuedAt &&
      new Date(dto.identityExpiresAt) <= new Date(dto.identityIssuedAt)
    ) {
      throw new BadRequestException({
        code: 'SELLER_DOCUMENT_EXPIRY_INVALID',
        message: 'Ngày hết hạn phải sau ngày cấp.',
        details: [{ field: 'identityExpiresAt' }],
      });
    }
  }

  private toDate(value?: string): Date | null {
    return value ? new Date(value) : null;
  }

  private toProfileResponse(profile: Record<string, unknown>) {
    return {
      id: String(profile.id),
      sellerType: profile.sellerType,
      businessType: profile.businessType,
      legalName: profile.legalName,
      identityDocumentType: profile.identityDocumentType,
      identityNumberMasked: this.crypto.mask(
        profile.identityNumberLast4 as string | null,
      ),
      identityIssuedAt: profile.identityIssuedAt,
      identityIssuedBy: profile.identityIssuedBy,
      identityExpiresAt: profile.identityExpiresAt,
      taxCodeMasked: this.crypto.mask(profile.taxCodeLast4 as string),
      businessRegistrationNumberMasked: this.crypto.mask(
        profile.businessRegistrationNumberLast4 as string | null,
      ),
      businessRegistrationIssuedAt: profile.businessRegistrationIssuedAt,
      businessRegistrationIssuedBy: profile.businessRegistrationIssuedBy,
      legalRepresentativeName: profile.legalRepresentativeName,
      registeredAddress: profile.registeredAddress,
      verificationStatus: profile.verificationStatus,
      submittedAt: profile.submittedAt,
      reviewedAt: profile.reviewedAt,
      documents: profile.documents ?? [],
      reviews: profile.reviews ?? [],
    };
  }

  private toPayoutResponse(account: Record<string, unknown>) {
    return {
      id: String(account.id),
      bankCode: account.bankCode,
      bankName: account.bankNameSnapshot,
      accountNumberMasked: this.crypto.mask(
        account.accountNumberLast4 as string,
      ),
      accountHolderName: account.accountHolderName,
      payoutStatus: account.payoutStatus,
    };
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}

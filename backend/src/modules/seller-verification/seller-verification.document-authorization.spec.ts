import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/types';
import { SellerDataCryptoService } from './seller-data-crypto.service';
import { SellerDocumentStorageService } from './seller-document-storage.service';
import { SellerDocumentValidatorService } from './seller-document-validator.service';
import { SellerVerificationService } from './seller-verification.service';
import { VerificationTransitionService } from './verification-transition.service';

const owner: AuthenticatedUser = {
  id: 7n,
  idString: '7',
  email: 'owner@example.com',
  phoneNumber: null,
  userStatus: 'Active',
  roles: [],
  profile: null,
};

describe('SellerVerificationService document authorization', () => {
  let shopFindFirst: jest.Mock;
  let documentFindFirst: jest.Mock;
  let auditCreate: jest.Mock;
  let documentUpdate: jest.Mock;
  let profileFindUniqueOrThrow: jest.Mock;
  let signedUrl: jest.Mock;
  let deleteAsset: jest.Mock;
  let service: SellerVerificationService;

  beforeEach(() => {
    shopFindFirst = jest.fn().mockResolvedValue({ id: 10n });
    documentFindFirst = jest.fn();
    auditCreate = jest.fn();
    documentUpdate = jest.fn();
    profileFindUniqueOrThrow = jest.fn();
    signedUrl = jest.fn();
    deleteAsset = jest.fn();

    const prisma = {
      shop: { findFirst: shopFindFirst },
      sellerVerificationDocument: {
        findFirst: documentFindFirst,
        update: documentUpdate,
      },
      sellerVerificationProfile: {
        findUniqueOrThrow: profileFindUniqueOrThrow,
      },
      sellerDocumentAccessAudit: { create: auditCreate },
    } as unknown as PrismaService;
    const storage = {
      signedUrl,
      delete: deleteAsset,
    } as unknown as SellerDocumentStorageService;

    service = new SellerVerificationService(
      prisma,
      {} as SellerDataCryptoService,
      storage,
      {} as SellerDocumentValidatorService,
      {} as VerificationTransitionService,
      { sendSubmissionReceived: jest.fn() } as never,
    );
  });

  it('owner access scopes the document query through the owned shop relation', async () => {
    const document = {
      id: 21n,
      verificationProfileId: 30n,
      storagePublicId: 'private/internal-id',
    };
    documentFindFirst.mockResolvedValue(document);
    auditCreate.mockResolvedValue({ id: 1n });
    signedUrl.mockResolvedValue({
      signedUrl: 'https://signed.example.test',
      expiresIn: 300,
    });

    const result = await service.accessMyDocument(owner, '21', {
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
    });

    expect(documentFindFirst).toHaveBeenCalledWith({
      where: {
        id: 21n,
        isDeleted: false,
        verificationProfile: { shopId: 10n },
      },
    });
    expect(auditCreate).toHaveBeenCalledTimes(1);
    expect(signedUrl).toHaveBeenCalledWith(document);
    expect(result).not.toHaveProperty('storagePublicId');
  });

  it('returns indistinguishable not-found and performs no side effects for another shop document', async () => {
    documentFindFirst.mockResolvedValue(null);

    await expect(
      service.accessMyDocument(owner, '999', {
        ipAddress: null,
        userAgent: null,
      }),
    ).rejects.toMatchObject({
      response: { code: 'SELLER_DOCUMENT_NOT_FOUND' },
    });
    expect(auditCreate).not.toHaveBeenCalled();
    expect(signedUrl).not.toHaveBeenCalled();
  });

  it('does not reveal soft-deleted documents', async () => {
    let capturedQuery: { where: { isDeleted: boolean } } | undefined;
    documentFindFirst.mockImplementation((query: unknown) => {
      capturedQuery = query as { where: { isDeleted: boolean } };
      return Promise.resolve(null);
    });

    await expect(
      service.accessMyDocument(owner, '22', {
        ipAddress: null,
        userAgent: null,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(capturedQuery?.where.isDeleted).toBe(false);
  });

  it('cannot delete another shop document or call private storage', async () => {
    documentFindFirst.mockResolvedValue(null);

    await expect(service.deleteMyDocument(owner, '999')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(profileFindUniqueOrThrow).not.toHaveBeenCalled();
    expect(deleteAsset).not.toHaveBeenCalled();
    expect(documentUpdate).not.toHaveBeenCalled();
  });
});

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppRole } from '../auth/app-role.enum';
import { AuthenticatedUser } from '../auth/types';
import { ShopsService } from './shops.service';

type ShopDelegateMock = {
  findUnique: jest.Mock<Promise<ShopEntity | null>, [unknown]>;
  findFirst: jest.Mock<Promise<ShopEntity | null>, [unknown]>;
  findMany: jest.Mock<Promise<ShopEntity[]>, [unknown]>;
  count: jest.Mock<Promise<number>, [unknown]>;
  create: jest.Mock<Promise<ShopEntity>, [ShopCreateArgs]>;
  update: jest.Mock<Promise<ShopEntity>, [ShopUpdateArgs]>;
};

type PrismaMock = {
  shop: ShopDelegateMock;
};

type ShopEntity = {
  id: bigint;
  ownerUserId: bigint;
  shopName: string;
  slug: string;
  description: string | null;
  email: string | null;
  phoneNumber: string | null;
  province: string | null;
  ward: string | null;
  streetAddress: string | null;
  taxCode: string | null;
  shopStatus: string;
  operationMode: 'Open' | 'PausedUntil' | 'PausedIndefinitely';
  pauseStartsAt: Date | null;
  pauseEndsAt: Date | null;
  pauseReason: string | null;
  operationUpdatedAt: Date | null;
  approvedByUserId: bigint | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date | null;
  sellerVerification?: { verificationStatus: 'Approved' } | null;
};

type ShopUpdateArgs = {
  where: { id: bigint };
  data: {
    shopStatus: string;
    approvedByUserId: bigint;
    approvedAt: Date;
    updatedAt: Date;
  };
};

type ShopCreateArgs = {
  data: {
    ownerUserId: bigint;
    shopName: string;
    slug: string;
    description: string | null;
    email: string | null;
    phoneNumber: string | null;
    province: string | null;
    ward: string | null;
    streetAddress: string | null;
    taxCode: string | null;
    shopStatus: string;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
};

const adminUser: AuthenticatedUser = {
  id: 99n,
  idString: '99',
  email: 'admin@example.com',
  phoneNumber: null,
  userStatus: 'Active',
  roles: [AppRole.Admin],
  profile: null,
};

const sellerUser: AuthenticatedUser = {
  id: 7n,
  idString: '7',
  email: 'seller@example.com',
  phoneNumber: null,
  userStatus: 'Active',
  roles: [AppRole.Seller],
  profile: null,
};

function createShopEntity(overrides: Partial<ShopEntity> = {}): ShopEntity {
  return {
    id: 1n,
    ownerUserId: 2n,
    shopName: 'Seller Home',
    slug: 'seller-home',
    description: null,
    email: null,
    phoneNumber: null,
    province: null,
    ward: null,
    streetAddress: null,
    taxCode: null,
    shopStatus: 'PendingApproval',
    operationMode: 'Open',
    pauseStartsAt: null,
    pauseEndsAt: null,
    pauseReason: null,
    operationUpdatedAt: null,
    approvedByUserId: null,
    approvedAt: null,
    rejectionReason: null,
    isDeleted: false,
    createdAt: new Date('2026-07-03T00:00:00.000Z'),
    updatedAt: new Date('2026-07-03T00:00:00.000Z'),
    ...overrides,
  };
}

describe('ShopsService', () => {
  let prisma: PrismaMock;
  let service: ShopsService;

  beforeEach(() => {
    prisma = {
      shop: {
        findUnique: jest.fn<Promise<ShopEntity | null>, [unknown]>(),
        findFirst: jest.fn<Promise<ShopEntity | null>, [unknown]>(),
        findMany: jest.fn<Promise<ShopEntity[]>, [unknown]>(),
        count: jest.fn<Promise<number>, [unknown]>(),
        create: jest.fn<Promise<ShopEntity>, [ShopCreateArgs]>(),
        update: jest.fn<Promise<ShopEntity>, [ShopUpdateArgs]>(),
      },
    };
    service = new ShopsService(prisma as unknown as PrismaService);
  });

  describe('listShops', () => {
    it('lists non-deleted shops filtered by status with pagination', async () => {
      prisma.shop.findMany.mockResolvedValue([createShopEntity()]);
      prisma.shop.count.mockResolvedValue(1);

      const result = await service.listShops({
        page: 2,
        limit: 5,
        status: 'PendingApproval',
      });
      const findArgs = prisma.shop.findMany.mock.calls[0][0] as {
        where: { isDeleted: boolean; shopStatus: string };
        skip: number;
        take: number;
      };

      expect(findArgs.where).toEqual({
        isDeleted: false,
        shopStatus: 'PendingApproval',
      });
      expect(findArgs.skip).toBe(5);
      expect(findArgs.take).toBe(5);
      expect(result.meta).toEqual({
        page: 2,
        limit: 5,
        total: 1,
        totalPages: 1,
      });
      expect(result.items[0].shopStatus).toBe('PendingApproval');
    });
  });

  describe('getMyShop', () => {
    it('returns the latest non-deleted shop owned by the current user', async () => {
      prisma.shop.findFirst.mockResolvedValue(
        createShopEntity({ ownerUserId: sellerUser.id }),
      );

      const result = await service.getMyShop(sellerUser);
      const findArgs = prisma.shop.findFirst.mock.calls[0][0] as {
        where: { ownerUserId: bigint; isDeleted: boolean };
      };

      expect(findArgs.where).toEqual({
        ownerUserId: sellerUser.id,
        isDeleted: false,
      });
      expect(result?.ownerUserId).toBe('7');
    });

    it('returns null when the current user has no shop', async () => {
      prisma.shop.findFirst.mockResolvedValue(null);

      await expect(service.getMyShop(sellerUser)).resolves.toBeNull();
    });
  });

  describe('createShop', () => {
    it('creates a draft shop without reserving the public slug', async () => {
      prisma.shop.findFirst.mockResolvedValue(null);
      prisma.shop.create.mockResolvedValue(
        createShopEntity({ ownerUserId: sellerUser.id, shopStatus: 'Draft', slug: 'draft-7' }),
      );

      const result = await service.createShop(sellerUser, {
        shopName: 'Seller Home',
        description: ' Home goods ',
        email: 'seller@example.com',
        phoneNumber: '0900000001',
        province: 'TP.HCM',
        ward: 'Ben Nghe',
        streetAddress: '10 Demo',
        taxCode: 'TAX001',
      });
      const createArgs = prisma.shop.create.mock.calls[0][0];

      expect(prisma.shop.findUnique).not.toHaveBeenCalled();
      expect(createArgs.data).toMatchObject({
        ownerUserId: sellerUser.id,
        shopName: 'Seller Home',
        slug: 'draft-7',
        description: 'Home goods',
        email: 'seller@example.com',
        phoneNumber: '0900000001',
        province: 'TP.HCM',
        ward: 'Ben Nghe',
        streetAddress: '10 Demo',
        taxCode: 'TAX001',
        shopStatus: 'Draft',
        isDeleted: false,
      });
      expect(createArgs.data.createdAt).toBeInstanceOf(Date);
      expect(result.ownerUserId).toBe('7');
      expect(result.shopStatus).toBe('Draft');
    });

    it('does not reject a display name already used by another draft', async () => {
      prisma.shop.findFirst.mockResolvedValue(null);
      prisma.shop.create.mockResolvedValue(createShopEntity({ ownerUserId: sellerUser.id, shopStatus: 'Draft', slug: 'draft-7' }));

      await expect(service.createShop(sellerUser, { shopName: 'Seller Home' })).resolves.toBeDefined();
      expect(prisma.shop.findUnique).not.toHaveBeenCalled();
      expect(prisma.shop.create).toHaveBeenCalledTimes(1);
    });

    it('rejects shop names that cannot produce a slug', async () => {
      await expect(
        service.createShop(sellerUser, {
          shopName: '!!!',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.shop.findUnique).not.toHaveBeenCalled();
      expect(prisma.shop.create).not.toHaveBeenCalled();
    });
  });

  describe('approveShop', () => {
    it('approves a pending shop and records the admin actor', async () => {
      const pendingShop = createShopEntity({
        sellerVerification: { verificationStatus: 'Approved' },
      });
      const approvedShop = createShopEntity({
        shopStatus: 'Approved',
        approvedByUserId: adminUser.id,
        approvedAt: new Date('2026-07-03T01:00:00.000Z'),
      });

      prisma.shop.findUnique.mockResolvedValue(pendingShop);
      prisma.shop.update.mockResolvedValue(approvedShop);

      const result = await service.approveShop(adminUser, '1');

      const updateArgs = prisma.shop.update.mock.calls[0][0];

      expect(updateArgs.where.id).toBe(1n);
      expect(updateArgs.data.shopStatus).toBe('Approved');
      expect(updateArgs.data.approvedByUserId).toBe(adminUser.id);
      expect(updateArgs.data.approvedAt).toBeInstanceOf(Date);
      expect(updateArgs.data.updatedAt).toBeInstanceOf(Date);
      expect(result.shopStatus).toBe('Approved');
      expect(result.approvedByUserId).toBe('99');
    });

    it('blocks a legacy pending shop with no verification record', async () => {
      prisma.shop.findUnique.mockResolvedValue(createShopEntity());

      await expect(service.approveShop(adminUser, '1')).rejects.toMatchObject({
        response: {
          code: 'SHOP_SELLER_VERIFICATION_REQUIRED',
          details: [
            {
              field: 'sellerVerification',
              verificationStatus: null,
            },
          ],
        },
      });
      expect(prisma.shop.update).not.toHaveBeenCalled();
    });
  });

  describe('rejectShop', () => {
    it('rejects a pending shop and records the admin actor', async () => {
      const pendingShop = createShopEntity();
      const rejectedShop = createShopEntity({
        shopStatus: 'Rejected',
        approvedByUserId: adminUser.id,
        approvedAt: new Date('2026-07-03T01:00:00.000Z'),
      });

      prisma.shop.findUnique.mockResolvedValue(pendingShop);
      prisma.shop.update.mockResolvedValue(rejectedShop);

      const result = await service.rejectShop(adminUser, '1', {
        reason: 'Hồ sơ chưa hợp lệ.',
      });

      const updateArgs = prisma.shop.update.mock.calls[0][0];

      expect(updateArgs.where.id).toBe(1n);
      expect(updateArgs.data.shopStatus).toBe('Rejected');
      expect(updateArgs.data.approvedByUserId).toBe(adminUser.id);
      expect(updateArgs.data.approvedAt).toBeInstanceOf(Date);
      expect(updateArgs.data.updatedAt).toBeInstanceOf(Date);
      expect(result.shopStatus).toBe('Rejected');
      expect(result.approvedByUserId).toBe('99');
    });

    it('rejects only pending shops', async () => {
      prisma.shop.findUnique.mockResolvedValue(
        createShopEntity({ shopStatus: 'Approved' }),
      );

      await expect(
        service.rejectShop(adminUser, '1', { reason: 'Hồ sơ chưa hợp lệ.' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.shop.update).not.toHaveBeenCalled();
    });

    it('returns not found for missing or deleted shops', async () => {
      prisma.shop.findUnique.mockResolvedValue(
        createShopEntity({ isDeleted: true }),
      );

      await expect(
        service.rejectShop(adminUser, '1', { reason: 'Hồ sơ chưa hợp lệ.' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.shop.update).not.toHaveBeenCalled();
    });
  });

  describe('shop operation availability', () => {
    it('treats scheduled pause boundaries and indefinite pause correctly', () => {
      const startsAt = new Date('2026-07-27T10:00:00.000Z');
      const endsAt = new Date('2026-07-27T12:00:00.000Z');
      const shop = createShopEntity({
        shopStatus: 'Approved',
        operationMode: 'PausedUntil',
        pauseStartsAt: startsAt,
        pauseEndsAt: endsAt,
      });
      const predicate = (service as unknown as {
        isOperationPaused: (value: ShopEntity, now: Date) => boolean;
      }).isOperationPaused;

      expect(predicate.call(service, shop, new Date('2026-07-27T09:59:59.999Z'))).toBe(false);
      expect(predicate.call(service, shop, startsAt)).toBe(true);
      expect(predicate.call(service, shop, new Date('2026-07-27T11:00:00.000Z'))).toBe(true);
      expect(predicate.call(service, shop, endsAt)).toBe(false);
      expect(predicate.call(service, { ...shop, operationMode: 'PausedIndefinitely' }, endsAt)).toBe(true);
    });

    it('does not report a non-approved shop as accepting orders', () => {
      const toOperationResponse = (service as unknown as {
        toOperationResponse: (value: ShopEntity, now: Date) => { isAcceptingOrders: boolean };
      }).toOperationResponse;
      expect(toOperationResponse.call(service, createShopEntity(), new Date()).isAcceptingOrders).toBe(false);
    });
  });
});

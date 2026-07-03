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
  district: string | null;
  ward: string | null;
  streetAddress: string | null;
  taxCode: string | null;
  shopStatus: string;
  approvedByUserId: bigint | null;
  approvedAt: Date | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date | null;
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
    district: string | null;
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
    district: null,
    ward: null,
    streetAddress: null,
    taxCode: null,
    shopStatus: 'PendingApproval',
    approvedByUserId: null,
    approvedAt: null,
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
        create: jest.fn<Promise<ShopEntity>, [ShopCreateArgs]>(),
        update: jest.fn<Promise<ShopEntity>, [ShopUpdateArgs]>(),
      },
    };
    service = new ShopsService(prisma as unknown as PrismaService);
  });

  describe('createShop', () => {
    it('creates a pending approval shop for the current seller', async () => {
      prisma.shop.findUnique.mockResolvedValue(null);
      prisma.shop.create.mockResolvedValue(
        createShopEntity({ ownerUserId: sellerUser.id }),
      );

      const result = await service.createShop(sellerUser, {
        shopName: 'Seller Home',
        description: ' Home goods ',
        email: 'seller@example.com',
        phoneNumber: '0900000001',
        province: 'TP.HCM',
        district: 'District 1',
        ward: 'Ben Nghe',
        streetAddress: '10 Demo',
        taxCode: 'TAX001',
      });
      const findArgs = prisma.shop.findUnique.mock.calls[0][0] as {
        where: { slug: string };
        select: { id: boolean };
      };
      const createArgs = prisma.shop.create.mock.calls[0][0];

      expect(findArgs).toEqual({
        where: { slug: 'seller-home' },
        select: { id: true },
      });
      expect(createArgs.data).toMatchObject({
        ownerUserId: sellerUser.id,
        shopName: 'Seller Home',
        slug: 'seller-home',
        description: 'Home goods',
        email: 'seller@example.com',
        phoneNumber: '0900000001',
        province: 'TP.HCM',
        district: 'District 1',
        ward: 'Ben Nghe',
        streetAddress: '10 Demo',
        taxCode: 'TAX001',
        shopStatus: 'PendingApproval',
        isDeleted: false,
      });
      expect(createArgs.data.createdAt).toBeInstanceOf(Date);
      expect(result.ownerUserId).toBe('7');
      expect(result.shopStatus).toBe('PendingApproval');
    });

    it('rejects duplicate shop slug', async () => {
      prisma.shop.findUnique.mockResolvedValue(createShopEntity());

      await expect(
        service.createShop(sellerUser, {
          shopName: 'Seller Home',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.shop.create).not.toHaveBeenCalled();
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
      const pendingShop = createShopEntity();
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

      const result = await service.rejectShop(adminUser, '1');

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

      await expect(service.rejectShop(adminUser, '1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.shop.update).not.toHaveBeenCalled();
    });

    it('returns not found for missing or deleted shops', async () => {
      prisma.shop.findUnique.mockResolvedValue(
        createShopEntity({ isDeleted: true }),
      );

      await expect(service.rejectShop(adminUser, '1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.shop.update).not.toHaveBeenCalled();
    });
  });
});

import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppRole } from '../auth/app-role.enum';
import { AuthenticatedUser } from '../auth/types';
import { UsersService } from './users.service';

const admin: AuthenticatedUser = {
  id: 99n,
  idString: '99',
  email: 'admin@example.com',
  phoneNumber: null,
  userStatus: 'Active',
  roles: [AppRole.Admin],
  profile: null,
};

const prismaMock = () => {
  const user = {
    findUnique: jest.fn(),
    update: jest.fn(),
  };
  const shop = { updateMany: jest.fn() };
  const order = { updateMany: jest.fn(), deleteMany: jest.fn() };
  return {
    user,
    shop,
    order,
    $transaction: jest.fn(async (operation: unknown) => {
      if (Array.isArray(operation)) return Promise.all(operation);
      return operation;
    }),
  };
};

describe('UsersService seller suspension', () => {
  it('suspends every non-deleted shop owned by the seller', async () => {
    const prisma = prismaMock();
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: 7n, isDeleted: false })
      .mockResolvedValueOnce({
        id: 7n,
        email: 'seller@example.com',
        phoneNumber: null,
        userStatus: 'Suspended',
        profile: null,
        ownedShops: [
          { id: 101n, shopName: 'A', shopStatus: 'Suspended' },
          { id: 102n, shopName: 'B', shopStatus: 'Suspended' },
        ],
        createdAt: new Date(),
        lastLoginAt: null,
      });
    prisma.user.update.mockResolvedValue({});
    prisma.shop.updateMany.mockResolvedValue({ count: 2 });

    const result = await new UsersService(
      prisma as unknown as PrismaService,
    ).setUserStatus(admin, '7', 'Suspended');

    expect(prisma.shop.updateMany).toHaveBeenCalledWith({
      where: { ownerUserId: 7n, isDeleted: false },
      data: {
        shopStatus: 'Suspended',
        updatedAt: expect.any(Date) as Date,
      },
    });
    expect(
      result.shops.every(
        (shop: { shopStatus: string }) => shop.shopStatus === 'Suspended',
      ),
    ).toBe(true);
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
    expect(prisma.order.deleteMany).not.toHaveBeenCalled();
  });

  it('activates account without reopening an admin-suspended shop', async () => {
    const prisma = prismaMock();
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: 7n, isDeleted: false })
      .mockResolvedValueOnce({
        id: 7n,
        email: 'seller@example.com',
        phoneNumber: null,
        userStatus: 'Active',
        profile: null,
        ownedShops: [{ id: 101n, shopName: 'A', shopStatus: 'Suspended' }],
        createdAt: new Date(),
        lastLoginAt: null,
      });
    prisma.user.update.mockResolvedValue({});

    const result = await new UsersService(
      prisma as unknown as PrismaService,
    ).setUserStatus(admin, '7', 'Active');

    expect(prisma.shop.updateMany).not.toHaveBeenCalled();
    expect(result.userStatus).toBe('Active');
    expect(result.shops[0].shopStatus).toBe('Suspended');
  });

  it('prevents an admin from suspending itself', async () => {
    const prisma = prismaMock();
    await expect(
      new UsersService(prisma as unknown as PrismaService).setUserStatus(
        admin,
        '99',
        'Suspended',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

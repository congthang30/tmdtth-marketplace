import { PrismaService } from '../../prisma/prisma.service';
import { AppRole } from './app-role.enum';
import { AppRolesService } from './app-roles.service';

describe('AppRolesService', () => {
  const originalAdminEmails = process.env.ADMIN_EMAILS;
  const originalSellerEmails = process.env.SELLER_EMAILS;
  let findFirst: jest.Mock;
  let service: AppRolesService;

  beforeEach(() => {
    process.env.ADMIN_EMAILS = 'admin@example.com';
    process.env.SELLER_EMAILS = 'configured@example.com';
    findFirst = jest.fn();
    service = new AppRolesService({
      shop: { findFirst },
    } as unknown as PrismaService);
  });

  afterAll(() => {
    restore('ADMIN_EMAILS', originalAdminEmails);
    restore('SELLER_EMAILS', originalSellerEmails);
  });

  it('grants Seller only when the user owns an approved active shop', async () => {
    findFirst.mockResolvedValue({ id: 10n });

    await expect(
      service.getRolesForUser({ id: 7n, email: 'owner@example.com' }),
    ).resolves.toEqual([AppRole.Customer, AppRole.Seller]);
    expect(findFirst).toHaveBeenCalledWith({
      where: { ownerUserId: 7n, shopStatus: 'Approved', isDeleted: false },
      select: { id: true },
    });
  });

  it('does not grant Seller for pending, rejected, missing or deleted shops', async () => {
    findFirst.mockResolvedValue(null);

    await expect(
      service.getRolesForUser({ id: 8n, email: 'pending@example.com' }),
    ).resolves.toEqual([AppRole.Customer]);
  });

  it('retains configured admin and development seller overrides', async () => {
    await expect(
      service.getRolesForUser({ id: 1n, email: 'admin@example.com' }),
    ).resolves.toEqual([AppRole.Customer, AppRole.Admin]);
    await expect(
      service.getRolesForUser({ id: 2n, email: 'configured@example.com' }),
    ).resolves.toEqual([AppRole.Customer, AppRole.Seller]);
    expect(findFirst).toHaveBeenCalledTimes(1);
  });
});

function restore(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

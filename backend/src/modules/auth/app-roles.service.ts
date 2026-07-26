import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppRole } from './app-role.enum';

function parseEmailList(envName: string, fallback: string[]): Set<string> {
  const rawValue = process.env[envName];
  const emails = rawValue
    ? rawValue.split(',').map((email) => email.trim().toLowerCase())
    : fallback;

  return new Set(emails.filter(Boolean));
}

@Injectable()
export class AppRolesService {
  constructor(private readonly prisma: PrismaService) {}

  async getRolesForUser(user: {
    id: bigint;
    email: string;
  }): Promise<AppRole[]> {
    const roles = new Set<AppRole>([AppRole.Customer]);
    const normalizedEmail = user.email.toLowerCase();
    const adminEmails = parseEmailList('ADMIN_EMAILS', ['admin@example.com']);
    const sellerEmails = parseEmailList('SELLER_EMAILS', [
      'seller@example.com',
    ]);

    if (adminEmails.has(normalizedEmail)) {
      roles.add(AppRole.Admin);
    }

    if (sellerEmails.has(normalizedEmail)) {
      roles.add(AppRole.Seller);
    }

    if (!roles.has(AppRole.Seller)) {
      const approvedShop = await this.prisma.shop.findFirst({
        where: {
          ownerUserId: user.id,
          shopStatus: 'Approved',
          isDeleted: false,
        },
        select: { id: true },
      });

      if (approvedShop) {
        roles.add(AppRole.Seller);
      }
    }

    return [...roles];
  }
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/types';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UserMeResponse } from './types';

type UserWithProfile =
  Awaited<ReturnType<UsersService['findActiveUserById']>> extends infer T
    ? NonNullable<T>
    : never;

type ProfileUpdateData = {
  fullName?: string;
  avatarUrl?: string | null;
  gender?: string | null;
  dateOfBirth?: Date | null;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(user: AuthenticatedUser): Promise<UserMeResponse> {
    const currentUser = await this.findActiveUserById(user.id);

    if (!currentUser) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Token không hợp lệ',
        details: [],
      });
    }

    return this.toMeResponse(currentUser, user);
  }

  async updateMe(
    user: AuthenticatedUser,
    dto: UpdateMeDto,
  ): Promise<UserMeResponse> {
    const updateData = this.buildProfileUpdateData(dto);

    if (Object.keys(updateData).length === 0) {
      return this.getMe(user);
    }

    const currentUser = await this.findActiveUserById(user.id);

    if (!currentUser) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Token không hợp lệ',
        details: [],
      });
    }

    if (!currentUser.profile && !updateData.fullName) {
      throw new BadRequestException({
        code: 'PROFILE_FULL_NAME_REQUIRED',
        message: 'fullName là bắt buộc khi tạo hồ sơ',
        details: [{ field: 'fullName' }],
      });
    }

    const now = new Date();
    const updatedUser = await this.prisma.$transaction(async (tx) => {
      await tx.userProfile.upsert({
        where: { userId: user.id },
        update: {
          ...updateData,
          updatedAt: now,
        },
        create: {
          userId: user.id,
          fullName:
            updateData.fullName ?? currentUser.profile?.fullName ?? 'User',
          avatarUrl: updateData.avatarUrl ?? null,
          gender: updateData.gender ?? null,
          dateOfBirth: updateData.dateOfBirth ?? null,
          createdAt: now,
          updatedAt: now,
        },
      });

      return tx.user.update({
        where: { id: user.id },
        data: { updatedAt: now },
        include: { profile: true },
      });
    });

    return this.toMeResponse(updatedUser, user);
  }

  async listAdminUsers(query: AdminUserQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sellerFilter =
      query.type === 'seller'
        ? { ownedShops: { some: { isDeleted: false } } }
        : query.type === 'customer'
          ? { ownedShops: { none: { isDeleted: false } } }
          : {};
    const q = query.q?.trim();
    const where = {
      isDeleted: false,
      ...(query.status ? { userStatus: query.status } : {}),
      ...sellerFilter,
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: 'insensitive' as const } },
              { phoneNumber: { contains: q } },
              {
                profile: {
                  fullName: { contains: q, mode: 'insensitive' as const },
                },
              },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          profile: true,
          ownedShops: {
            where: { isDeleted: false },
            select: { id: true, shopName: true, shopStatus: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items: items.map((user) => ({
        id: user.id.toString(),
        email: user.email,
        phoneNumber: user.phoneNumber,
        fullName: user.profile?.fullName ?? null,
        avatarUrl: user.profile?.avatarUrl ?? null,
        userStatus: user.userStatus,
        isSeller: user.ownedShops.length > 0,
        shops: user.ownedShops.map((shop) => ({
          ...shop,
          id: shop.id.toString(),
        })),
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async adminUpdateUser(
    admin: AuthenticatedUser,
    id: string,
    dto: AdminUpdateUserDto,
  ) {
    const userId = this.parseAdminUserId(id);
    await this.requireAdminTarget(userId);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      if (dto.fullName !== undefined)
        await tx.userProfile.upsert({
          where: { userId },
          update: { fullName: dto.fullName.trim(), updatedAt: now },
          create: {
            userId,
            fullName: dto.fullName.trim(),
            createdAt: now,
            updatedAt: now,
          },
        });
      await tx.user.update({
        where: { id: userId },
        data: {
          ...(dto.phoneNumber !== undefined
            ? { phoneNumber: dto.phoneNumber.trim() || null }
            : {}),
          updatedAt: now,
        },
      });
    });
    return this.getAdminUser(userId);
  }

  async setUserStatus(
    admin: AuthenticatedUser,
    id: string,
    status: 'Active' | 'Suspended',
  ) {
    const userId = this.parseAdminUserId(id);
    if (userId === admin.id)
      throw new ForbiddenException({
        code: 'ADMIN_SELF_MANAGEMENT_FORBIDDEN',
        message:
          'Không thể khóa hoặc mở khóa chính tài khoản quản trị đang đăng nhập.',
        details: [],
      });
    await this.requireAdminTarget(userId);
    const now = new Date();
    if (status === 'Suspended') {
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: userId },
          data: { userStatus: status, updatedAt: now },
        }),
        this.prisma.shop.updateMany({
          where: { ownerUserId: userId, isDeleted: false },
          data: { shopStatus: 'Suspended', updatedAt: now },
        }),
      ]);
    } else {
      // Mở khóa đăng nhập không tự mở lại các shop đã bị đình chỉ.
      await this.prisma.user.update({
        where: { id: userId },
        data: { userStatus: status, updatedAt: now },
      });
    }
    return this.getAdminUser(userId);
  }

  async adminDeleteUser(admin: AuthenticatedUser, id: string) {
    const userId = this.parseAdminUserId(id);
    if (userId === admin.id)
      throw new ForbiddenException({
        code: 'ADMIN_SELF_DELETE_FORBIDDEN',
        message: 'Không thể xóa chính tài khoản quản trị đang đăng nhập.',
        details: [],
      });
    await this.requireAdminTarget(userId);
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          isDeleted: true,
          userStatus: 'Deleted',
          deletedAt: now,
          updatedAt: now,
        },
      }),
      this.prisma.shop.updateMany({
        where: { ownerUserId: userId, isDeleted: false },
        data: { shopStatus: 'Suspended', updatedAt: now },
      }),
    ]);
    return { id, deleted: true };
  }

  private async getAdminUser(id: bigint) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        ownedShops: {
          where: { isDeleted: false },
          select: { id: true, shopName: true, shopStatus: true },
        },
      },
    });
    if (!user)
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Không tìm thấy người dùng.',
        details: [],
      });
    return {
      id: user.id.toString(),
      email: user.email,
      phoneNumber: user.phoneNumber,
      fullName: user.profile?.fullName ?? null,
      avatarUrl: user.profile?.avatarUrl ?? null,
      userStatus: user.userStatus,
      isSeller: user.ownedShops.length > 0,
      shops: user.ownedShops.map((shop) => ({
        ...shop,
        id: shop.id.toString(),
      })),
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  private async requireAdminTarget(id: bigint) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, isDeleted: true },
    });
    if (!user || user.isDeleted)
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Không tìm thấy người dùng.',
        details: [],
      });
  }

  private parseAdminUserId(value: string) {
    if (!/^\d+$/.test(value))
      throw new BadRequestException({
        code: 'INVALID_USER_ID',
        message: 'Mã người dùng không hợp lệ.',
        details: [],
      });
    return BigInt(value);
  }

  private async findActiveUserById(userId: bigint) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
  }

  private buildProfileUpdateData(dto: UpdateMeDto): ProfileUpdateData {
    const data: ProfileUpdateData = {};

    if (dto.fullName !== undefined) {
      data.fullName = dto.fullName;
    }

    if (dto.avatarUrl !== undefined) {
      data.avatarUrl = this.normalizeNullableText(dto.avatarUrl);
    }

    if (dto.gender !== undefined) {
      data.gender = this.normalizeNullableText(dto.gender);
    }

    if (dto.dateOfBirth !== undefined) {
      data.dateOfBirth =
        dto.dateOfBirth === null
          ? null
          : this.parseDateOfBirth(dto.dateOfBirth);
    }

    return data;
  }

  private normalizeNullableText(value: string | null): string | null {
    if (value === null) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private parseDateOfBirth(value: string): Date {
    const dateOfBirth = new Date(value);

    if (dateOfBirth.getTime() > Date.now()) {
      throw new BadRequestException({
        code: 'INVALID_DATE_OF_BIRTH',
        message: 'Ngày sinh không được ở tương lai',
        details: [{ field: 'dateOfBirth' }],
      });
    }

    return dateOfBirth;
  }

  private toMeResponse(
    user: UserWithProfile,
    authenticatedUser: AuthenticatedUser,
  ): UserMeResponse {
    return {
      id: user.id.toString(),
      idString: user.id.toString(),
      email: user.email,
      phoneNumber: user.phoneNumber,
      userStatus: user.userStatus,
      emailConfirmed: user.emailConfirmed,
      phoneConfirmed: user.phoneConfirmed,
      roles: authenticatedUser.roles,
      profile: user.profile
        ? {
            fullName: user.profile.fullName,
            gender: user.profile.gender,
            dateOfBirth: user.profile.dateOfBirth,
            avatarUrl: user.profile.avatarUrl,
          }
        : null,
    };
  }
}

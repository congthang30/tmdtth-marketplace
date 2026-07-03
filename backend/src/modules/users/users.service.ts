import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/types';
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

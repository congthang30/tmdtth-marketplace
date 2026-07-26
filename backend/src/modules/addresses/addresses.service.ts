import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { createPaginatedResult } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/types';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { AddressResponse, DeleteAddressResponse } from './types';

type AddressEntity =
  Awaited<ReturnType<AddressesService['findAddressById']>> extends infer T
    ? NonNullable<T>
    : never;

type AddressUpdateData = Partial<
  Pick<
    AddressResponse,
    | 'receiverName'
    | 'phoneNumber'
    | 'province'
    | 'ward'
    | 'streetAddress'
    | 'fullAddress'
  >
>;

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async listMyAddresses(user: AuthenticatedUser, query: PaginationQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;
    const where = {
      userId: user.id,
      isDeleted: false,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.address.findMany({
        where,
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.address.count({ where }),
    ]);

    return createPaginatedResult({
      items: items.map((address) => this.toResponse(address)),
      page,
      limit,
      total,
    });
  }

  async createAddress(
    user: AuthenticatedUser,
    dto: CreateAddressDto,
  ): Promise<AddressResponse> {
    const now = new Date();
    const shouldSetDefault =
      dto.isDefault === true ||
      (await this.prisma.address.count({
        where: { userId: user.id, isDeleted: false },
      })) === 0;

    const address = await this.prisma.$transaction(async (tx) => {
      if (shouldSetDefault) {
        await tx.address.updateMany({
          where: { userId: user.id, isDeleted: false },
          data: { isDefault: false, updatedAt: now },
        });
      }

      return tx.address.create({
        data: {
          userId: user.id,
          receiverName: dto.receiverName,
          phoneNumber: dto.phoneNumber,
          province: dto.province,
          ward: dto.ward,
          streetAddress: dto.streetAddress,
          fullAddress: this.buildFullAddress(dto),
          isDefault: shouldSetDefault,
          createdAt: now,
          updatedAt: now,
        },
      });
    });

    return this.toResponse(address);
  }

  async updateAddress(
    user: AuthenticatedUser,
    addressId: string,
    dto: UpdateAddressDto,
  ): Promise<AddressResponse> {
    const id = this.parseAddressId(addressId);
    const address = await this.requireOwnedAddress(user, id);
    const updateData = this.buildUpdateData(address, dto);

    if (Object.keys(updateData).length === 0) {
      return this.toResponse(address);
    }

    const updatedAddress = await this.prisma.address.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });

    return this.toResponse(updatedAddress);
  }

  async deleteAddress(
    user: AuthenticatedUser,
    addressId: string,
  ): Promise<DeleteAddressResponse> {
    const id = this.parseAddressId(addressId);
    const address = await this.requireOwnedAddress(user, id);
    const now = new Date();
    const wasDefault = address.isDefault;

    await this.prisma.$transaction(async (tx) => {
      await tx.address.update({
        where: { id },
        data: {
          isDeleted: true,
          isDefault: false,
          deletedAt: now,
          updatedAt: now,
        },
      });

      if (wasDefault) {
        const replacement = await tx.address.findFirst({
          where: {
            userId: user.id,
            isDeleted: false,
            id: { not: id },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (replacement) {
          await tx.address.update({
            where: { id: replacement.id },
            data: { isDefault: true, updatedAt: now },
          });
        }
      }
    });

    return {
      id: id.toString(),
      deleted: true,
    };
  }

  async setDefaultAddress(
    user: AuthenticatedUser,
    addressId: string,
  ): Promise<AddressResponse> {
    const id = this.parseAddressId(addressId);
    await this.requireOwnedAddress(user, id);
    const now = new Date();

    const updatedAddress = await this.prisma.$transaction(async (tx) => {
      await tx.address.updateMany({
        where: { userId: user.id, isDeleted: false },
        data: { isDefault: false, updatedAt: now },
      });

      return tx.address.update({
        where: { id },
        data: { isDefault: true, updatedAt: now },
      });
    });

    return this.toResponse(updatedAddress);
  }

  private async requireOwnedAddress(
    user: AuthenticatedUser,
    addressId: bigint,
  ): Promise<AddressEntity> {
    const address = await this.findAddressById(addressId);

    if (!address || address.isDeleted) {
      throw new NotFoundException({
        code: 'ADDRESS_NOT_FOUND',
        message: 'Không tìm thấy địa chỉ',
        details: [{ field: 'id' }],
      });
    }

    if (address.userId !== user.id) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Không có quyền truy cập địa chỉ này',
        details: [],
      });
    }

    return address;
  }

  private async findAddressById(addressId: bigint) {
    return this.prisma.address.findUnique({
      where: { id: addressId },
    });
  }

  private parseAddressId(addressId: string): bigint {
    if (!/^\d+$/.test(addressId)) {
      throw new BadRequestException({
        code: 'INVALID_ADDRESS_ID',
        message: 'Id địa chỉ không hợp lệ',
        details: [{ field: 'id' }],
      });
    }

    return BigInt(addressId);
  }

  private buildUpdateData(
    address: AddressEntity,
    dto: UpdateAddressDto,
  ): AddressUpdateData {
    const data: AddressUpdateData = {};

    if (dto.receiverName !== undefined) {
      data.receiverName = dto.receiverName;
    }

    if (dto.phoneNumber !== undefined) {
      data.phoneNumber = dto.phoneNumber;
    }

    if (dto.province !== undefined) {
      data.province = dto.province;
    }

    if (dto.ward !== undefined) {
      data.ward = dto.ward;
    }

    if (dto.streetAddress !== undefined) {
      data.streetAddress = dto.streetAddress;
    }

    if (dto.fullAddress !== undefined) {
      data.fullAddress = this.normalizeNullableText(dto.fullAddress);
    } else if (
      dto.province !== undefined ||
      dto.ward !== undefined ||
      dto.streetAddress !== undefined
    ) {
      data.fullAddress = this.buildFullAddress({
        province: dto.province ?? address.province,
        ward: dto.ward ?? address.ward,
        streetAddress: dto.streetAddress ?? address.streetAddress,
      });
    }

    return data;
  }

  private buildFullAddress(address: {
    fullAddress?: string | null;
    province: string;
    ward: string;
    streetAddress: string;
  }): string {
    const customFullAddress = this.normalizeNullableText(
      address.fullAddress ?? null,
    );

    if (customFullAddress) {
      return customFullAddress;
    }

    return [
      address.streetAddress,
      address.ward,
      address.province,
    ].join(', ');
  }

  private normalizeNullableText(value: string | null): string | null {
    if (value === null) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private toResponse(address: AddressEntity): AddressResponse {
    return {
      id: address.id.toString(),
      idString: address.id.toString(),
      receiverName: address.receiverName,
      phoneNumber: address.phoneNumber,
      province: address.province,
      ward: address.ward,
      streetAddress: address.streetAddress,
      fullAddress: address.fullAddress,
      isDefault: address.isDefault,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }
}

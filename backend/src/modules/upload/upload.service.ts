import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  createPaginatedResult,
  getPaginationParams,
} from '../../common/utils/pagination.util';
import { getCloudinaryFolder } from '../../config/upload.config';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/types';

export type UploadedFileResponse = {
  id: string;
  assetId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  status: string;
};

const JPEG_SIGNATURE = [0xff, 0xd8, 0xff] as const;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
const GIF87A_SIGNATURE = [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] as const;
const GIF89A_SIGNATURE = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] as const;
const RIFF_SIGNATURE = Buffer.from('RIFF');
const WEBP_SIGNATURE = Buffer.from('WEBP');

function startsWithBytes(
  buffer: Buffer,
  signature: readonly number[],
): boolean {
  return (
    buffer.length >= signature.length &&
    signature.every((byte, index) => buffer[index] === byte)
  );
}

@Injectable()
export class UploadService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UploadService.name);
  private cleanupTimer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    void this.cleanupStalePending().catch((error) =>
      this.logger.error('Không thể dọn upload asset hết hạn', error),
    );
    this.cleanupTimer = setInterval(
      () => {
        void this.cleanupStalePending().catch((error) =>
          this.logger.error('Không thể dọn upload asset hết hạn', error),
        );
      },
      24 * 60 * 60 * 1000,
    );
    this.cleanupTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }
  assertUploadedImage(file: Express.Multer.File): void {
    if (this.hasValidImageContent(file)) {
      return;
    }

    throw new BadRequestException({
      code: 'UPLOAD_INVALID_FILE_TYPE',
      message: 'Chỉ hỗ trợ upload ảnh jpg, png, webp hoặc gif',
      details: [{ field: 'file', mimeType: file.mimetype }],
    });
  }

  async upload(
    user: AuthenticatedUser,
    file: Express.Multer.File,
  ): Promise<UploadedFileResponse> {
    this.assertCloudinaryConfigured();

    try {
      const result = await this.uploadBuffer(file.buffer, user.id);
      const asset = await this.prisma.uploadAsset.create({
        data: {
          ownerUserId: user.id,
          storagePublicId: result.public_id,
          url: result.secure_url,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: result.bytes,
          status: 'Pending',
        },
      });

      return {
        id: asset.id.toString(),
        assetId: asset.id.toString(),
        fileName: `${result.public_id}.${result.format}`,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: result.bytes,
        url: result.secure_url,
        status: asset.status,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException({
        code: 'UPLOAD_PROVIDER_UNAVAILABLE',
        message: 'Không thể tải hình ảnh lên lúc này. Vui lòng thử lại.',
        details: [],
      });
    }
  }

  async listFiles(user: AuthenticatedUser, query: PaginationQueryDto) {
    const { page, limit, skip, take } = getPaginationParams(query);
    const q = query.q?.trim();
    const where = {
      ownerUserId: user.id,
      ...(q
        ? { originalName: { contains: q, mode: 'insensitive' as const } }
        : {}),
    };
    const [assets, total] = await this.prisma.$transaction([
      this.prisma.uploadAsset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.uploadAsset.count({ where }),
    ]);
    return createPaginatedResult({
      items: assets.map((asset) => ({
        id: asset.id.toString(),
        assetId: asset.id.toString(),
        fileName: asset.storagePublicId,
        originalName: asset.originalName,
        mimeType: asset.mimeType,
        size: asset.size,
        createdAt: asset.createdAt.toISOString(),
        updatedAt: (asset.attachedAt ?? asset.createdAt).toISOString(),
        url: asset.url,
        status: asset.status,
      })),
      page,
      limit,
      total,
      message: 'OK',
    });
  }

  async cleanupStalePending(now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const assets = await this.prisma.uploadAsset.findMany({
      where: {
        status: 'Pending',
        createdAt: { lt: cutoff },
        productImage: null,
        shopAvatar: null,
      },
      select: { id: true, storagePublicId: true },
    });
    let removed = 0;
    for (const asset of assets) {
      const claimed = await this.prisma.uploadAsset.deleteMany({
        where: {
          id: asset.id,
          status: 'Pending',
          productImage: null,
          shopAvatar: null,
        },
      });
      if (claimed.count !== 1) continue;
      try {
        await cloudinary.uploader.destroy(asset.storagePublicId, {
          resource_type: 'image',
        });
        removed += 1;
      } catch (error) {
        this.logger.error(
          `Không thể xóa upload asset ${asset.id.toString()}`,
          error,
        );
      }
    }
    return removed;
  }

  private assertCloudinaryConfigured(): void {
    if (process.env.CLOUDINARY_URL?.trim()) {
      return;
    }

    throw new ServiceUnavailableException({
      code: 'UPLOAD_PROVIDER_NOT_CONFIGURED',
      message: 'Dịch vụ lưu trữ hình ảnh chưa được cấu hình.',
      details: [],
    });
  }

  private uploadBuffer(
    buffer: Buffer,
    ownerUserId: bigint,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `${getCloudinaryFolder()}/${ownerUserId.toString()}`,
          public_id: `${Date.now()}-${randomUUID()}`,
          resource_type: 'image',
          overwrite: false,
        },
        (error, result) => {
          if (error || !result) {
            reject(
              error instanceof Error
                ? error
                : new Error(
                    error?.message ?? 'Cloudinary returned no upload result.',
                  ),
            );
            return;
          }

          resolve(result);
        },
      );

      stream.end(buffer);
    });
  }

  private hasValidImageContent(file: Express.Multer.File): boolean {
    const header = file.buffer?.subarray(0, 12);

    if (!header) {
      return false;
    }

    switch (file.mimetype) {
      case 'image/jpeg':
        return startsWithBytes(header, JPEG_SIGNATURE);
      case 'image/png':
        return startsWithBytes(header, PNG_SIGNATURE);
      case 'image/gif':
        return (
          startsWithBytes(header, GIF87A_SIGNATURE) ||
          startsWithBytes(header, GIF89A_SIGNATURE)
        );
      case 'image/webp':
        return (
          header.length >= 12 &&
          header.subarray(0, 4).equals(RIFF_SIGNATURE) &&
          header.subarray(8, 12).equals(WEBP_SIGNATURE)
        );
      default:
        return false;
    }
  }
}

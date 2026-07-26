import {
  BadRequestException,
  Injectable,
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

export type UploadedFileResponse = {
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
};

export type StoredUploadFile = {
  fileName: string;
  size: number;
  createdAt: string;
  updatedAt: string;
  url: string;
};

type CloudinarySearchResource = {
  public_id: string;
  format?: string;
  bytes: number;
  created_at: string;
  secure_url: string;
};

type CloudinarySearchResult = {
  total_count: number;
  resources: CloudinarySearchResource[];
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
export class UploadService {
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

  async upload(file: Express.Multer.File): Promise<UploadedFileResponse> {
    this.assertCloudinaryConfigured();

    try {
      const result = await this.uploadBuffer(file.buffer);

      return {
        fileName: `${result.public_id}.${result.format}`,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: result.bytes,
        url: result.secure_url,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      throw new ServiceUnavailableException({
        code: 'UPLOAD_PROVIDER_UNAVAILABLE',
        message: 'Không thể tải hình ảnh lên lúc này. Vui lòng thử lại.',
        details: [],
      });
    }
  }

  async listFiles(query: PaginationQueryDto) {
    this.assertCloudinaryConfigured();
    const { page, limit, skip } = getPaginationParams(query);
    const q = query.q?.trim();
    const folder = getCloudinaryFolder();
    const escapedFolder = folder.replace(/([:\\])/g, '\\$1');
    const escapedQuery = q?.replace(/([:\\])/g, '\\$1');
    const expression = [
      `folder:${escapedFolder}`,
      escapedQuery ? `public_id:*${escapedQuery}*` : undefined,
    ]
      .filter(Boolean)
      .join(' AND ');

    try {
      const result = (await cloudinary.search
        .expression(expression)
        .sort_by('created_at', 'desc')
        .max_results(Math.min(skip + limit, 500))
        .execute()) as CloudinarySearchResult;
      const items: StoredUploadFile[] = result.resources
        .slice(skip, skip + limit)
        .map((resource) => ({
          fileName: `${resource.public_id}.${resource.format ?? ''}`.replace(
            /\.$/,
            '',
          ),
          size: resource.bytes,
          createdAt: resource.created_at,
          updatedAt: resource.created_at,
          url: resource.secure_url,
        }));

      return createPaginatedResult({
        items,
        page,
        limit,
        total: result.total_count,
        message: 'OK',
      });
    } catch {
      throw new ServiceUnavailableException({
        code: 'UPLOAD_PROVIDER_UNAVAILABLE',
        message: 'Không thể tải danh sách hình ảnh lúc này. Vui lòng thử lại.',
        details: [],
      });
    }
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

  private uploadBuffer(buffer: Buffer): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: getCloudinaryFolder(),
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

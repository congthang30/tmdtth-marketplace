import { BadRequestException, Injectable } from '@nestjs/common';
import { readdirSync, readFileSync, statSync, unlinkSync } from 'fs';
import { extname, join } from 'path';
import {
  buildUploadUrl,
  ensureUploadRoot,
  getUploadRoot,
} from '../../config/upload.config';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  createPaginatedResult,
  getPaginationParams,
} from '../../common/utils/pagination.util';

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

    this.removeStoredFile(file);

    throw new BadRequestException({
      code: 'UPLOAD_INVALID_FILE_TYPE',
      message: 'Only jpg, png, webp, or gif images are supported',
      details: [{ field: 'file', mimeType: file.mimetype }],
    });
  }

  createUploadResponse(file: Express.Multer.File): UploadedFileResponse {
    return {
      fileName: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: buildUploadUrl(file.filename),
    };
  }

  listFiles(query: PaginationQueryDto) {
    const uploadRoot = ensureUploadRoot();
    const { page, limit, skip, take } = getPaginationParams(query);
    const q = query.q?.trim().toLowerCase();
    const files = readdirSync(uploadRoot)
      .map((fileName) => {
        const filePath = join(uploadRoot, fileName);
        const stat = statSync(filePath);

        return { fileName, filePath, stat };
      })
      .filter((file) => file.stat.isFile())
      .filter((file) => (q ? file.fileName.toLowerCase().includes(q) : true))
      .filter((file) =>
        ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(
          extname(file.fileName).toLowerCase(),
        ),
      )
      .sort((left, right) => right.stat.mtimeMs - left.stat.mtimeMs);

    const items: StoredUploadFile[] = files
      .slice(skip, skip + take)
      .map(({ fileName, stat }) => ({
        fileName,
        size: stat.size,
        createdAt: stat.birthtime.toISOString(),
        updatedAt: stat.mtime.toISOString(),
        url: buildUploadUrl(fileName),
      }));

    return createPaginatedResult({
      items,
      page,
      limit,
      total: files.length,
      message: 'OK',
    });
  }

  getUploadRoot(): string {
    return getUploadRoot();
  }

  private hasValidImageContent(file: Express.Multer.File): boolean {
    if (!file.path) {
      return false;
    }

    const header = readFileSync(file.path).subarray(0, 12);

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

  private removeStoredFile(file: Express.Multer.File): void {
    if (!file.path) {
      return;
    }

    try {
      unlinkSync(file.path);
    } catch {
      // Best-effort cleanup; callers should still receive the upload error.
    }
  }
}

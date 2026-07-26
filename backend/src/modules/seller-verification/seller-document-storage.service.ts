import { randomUUID, createHash } from 'crypto';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import {
  getSellerDocumentFolder,
  getSellerDocumentSignedUrlTtlSeconds,
} from '../../config/seller-verification.config';

type PrivateResourceType = 'image' | 'raw';

export type PrivateDocumentAsset = {
  publicId: string;
  deliveryType: string;
  resourceType: PrivateResourceType;
  format: string;
  bytes: number;
  checksum: string;
};

@Injectable()
export class SellerDocumentStorageService {
  async upload(file: Express.Multer.File): Promise<PrivateDocumentAsset> {
    this.assertConfigured();
    const publicId = `${getSellerDocumentFolder()}/${Date.now()}-${randomUUID()}`;
    const resourceType = file.mimetype === 'application/pdf' ? 'raw' : 'image';
    const result = await this.retry(() =>
      this.uploadBuffer(file.buffer, publicId, resourceType),
    );
    return {
      publicId: result.public_id,
      deliveryType: 'authenticated',
      resourceType,
      format: result.format ?? this.extension(file.originalname),
      bytes: result.bytes,
      checksum: createHash('sha256').update(file.buffer).digest('hex'),
    };
  }

  signedUrl(asset: {
    storagePublicId: string;
    resourceType: string;
    format: string;
  }): { url: string; expiresAt: string } {
    this.assertConfigured();
    const expiresAt =
      Math.floor(Date.now() / 1000) + getSellerDocumentSignedUrlTtlSeconds();
    const url = cloudinary.url(asset.storagePublicId, {
      type: 'authenticated',
      resource_type: asset.resourceType,
      format: asset.format,
      sign_url: true,
      secure: true,
      expires_at: expiresAt,
    });
    return { url, expiresAt: new Date(expiresAt * 1000).toISOString() };
  }

  async delete(asset: {
    storagePublicId: string;
    resourceType: string;
  }): Promise<void> {
    this.assertConfigured();
    await this.retry(async () => {
      const result = (await cloudinary.uploader.destroy(asset.storagePublicId, {
        type: 'authenticated',
        resource_type: asset.resourceType,
        invalidate: true,
      })) as { result?: string };
      if (!result.result || !['ok', 'not found'].includes(result.result)) {
        throw new Error(
          'Cloudinary did not confirm private document deletion.',
        );
      }
    });
  }

  private uploadBuffer(
    buffer: Buffer,
    publicId: string,
    resourceType: PrivateResourceType,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          type: 'authenticated',
          resource_type: resourceType,
          overwrite: false,
          use_filename: false,
        },
        (error, result) => {
          if (result) {
            resolve(result);
            return;
          }
          reject(
            error instanceof Error
              ? error
              : new Error('Cloudinary private upload failed.'),
          );
        },
      );
      stream.end(buffer);
    });
  }

  private async retry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
      }
    }
    throw new ServiceUnavailableException({
      code: 'SELLER_DOCUMENT_STORAGE_UNAVAILABLE',
      message: 'Không thể xử lý tài liệu xác minh lúc này. Vui lòng thử lại.',
      details: [],
      cause: lastError instanceof Error ? lastError.message : undefined,
    });
  }

  private assertConfigured(): void {
    if (!process.env.CLOUDINARY_URL?.trim()) {
      throw new ServiceUnavailableException({
        code: 'SELLER_DOCUMENT_STORAGE_NOT_CONFIGURED',
        message: 'Dịch vụ lưu trữ tài liệu xác minh chưa được cấu hình.',
        details: [],
      });
    }
  }

  private extension(fileName: string): string {
    return fileName.split('.').pop()?.toLowerCase() || 'bin';
  }
}

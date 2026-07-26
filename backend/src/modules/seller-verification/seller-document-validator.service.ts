import { BadRequestException, Injectable } from '@nestjs/common';
import { getSellerDocumentMaxFileSizeBytes } from '../../config/seller-verification.config';

const EXTENSIONS: Readonly<Record<string, readonly string[]>> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'application/pdf': ['pdf'],
};

@Injectable()
export class SellerDocumentValidatorService {
  validate(file: Express.Multer.File): void {
    if (!file.buffer.length || file.size <= 0) {
      throw this.invalid(
        'SELLER_DOCUMENT_EMPTY',
        'Tài liệu tải lên đang trống.',
      );
    }
    if (file.size > getSellerDocumentMaxFileSizeBytes()) {
      throw this.invalid(
        'SELLER_DOCUMENT_TOO_LARGE',
        'Tài liệu vượt quá dung lượng cho phép.',
      );
    }
    const extensions = EXTENSIONS[file.mimetype];
    if (!extensions) {
      throw this.invalid(
        'SELLER_DOCUMENT_MIME_INVALID',
        'Chỉ hỗ trợ tài liệu JPG, PNG hoặc PDF.',
      );
    }
    const extension = file.originalname.split('.').pop()?.toLowerCase();
    if (!extension || !extensions.includes(extension)) {
      throw this.invalid(
        'SELLER_DOCUMENT_EXTENSION_INVALID',
        'Phần mở rộng của tài liệu không khớp định dạng được hỗ trợ.',
      );
    }
    if (!this.matchesMagicBytes(file.mimetype, file.buffer)) {
      throw this.invalid(
        'SELLER_DOCUMENT_CONTENT_INVALID',
        'Nội dung tài liệu không khớp với định dạng đã khai báo.',
      );
    }
  }

  private matchesMagicBytes(mimeType: string, buffer: Buffer): boolean {
    if (mimeType === 'image/jpeg') {
      return (
        buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff
      );
    }
    if (mimeType === 'image/png') {
      return (
        buffer.length >= 8 &&
        buffer
          .subarray(0, 8)
          .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
      );
    }
    return (
      buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-'
    );
  }

  private invalid(code: string, message: string): BadRequestException {
    return new BadRequestException({
      code,
      message,
      details: [{ field: 'file' }],
    });
  }
}

import { BadRequestException } from '@nestjs/common';
import { SellerDocumentValidatorService } from './seller-document-validator.service';

describe('SellerDocumentValidatorService', () => {
  const validator = new SellerDocumentValidatorService();
  const previousLimit = process.env.SELLER_DOCUMENT_MAX_FILE_SIZE_BYTES;

  beforeEach(() => {
    process.env.SELLER_DOCUMENT_MAX_FILE_SIZE_BYTES = '1024';
  });

  afterAll(() => {
    if (previousLimit === undefined) {
      delete process.env.SELLER_DOCUMENT_MAX_FILE_SIZE_BYTES;
    } else {
      process.env.SELLER_DOCUMENT_MAX_FILE_SIZE_BYTES = previousLimit;
    }
  });

  it.each([
    ['proof.jpg', 'image/jpeg', Buffer.from([0xff, 0xd8, 0xff, 0x00])],
    [
      'proof.png',
      'image/png',
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ],
    ['proof.pdf', 'application/pdf', Buffer.from('%PDF-1.7')],
  ])('accepts valid %s', (originalname, mimetype, buffer) => {
    expect(() =>
      validator.validate(file(originalname, mimetype, buffer)),
    ).not.toThrow();
  });

  it.each([
    ['proof.exe', 'application/octet-stream', Buffer.from('MZ')],
    ['proof.png', 'image/jpeg', Buffer.from([0xff, 0xd8, 0xff])],
    ['proof.jpg', 'image/jpeg', Buffer.from('not-jpeg')],
    ['proof.pdf', 'application/pdf', Buffer.alloc(0)],
  ])('rejects invalid upload %s', (originalname, mimetype, buffer) => {
    expect(() =>
      validator.validate(file(originalname, mimetype, buffer)),
    ).toThrow(BadRequestException);
  });

  it('rejects a file over the configured size', () => {
    expect(() =>
      validator.validate(
        file('proof.pdf', 'application/pdf', Buffer.alloc(1025)),
      ),
    ).toThrow(BadRequestException);
  });
});

function file(
  originalname: string,
  mimetype: string,
  buffer: Buffer,
): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname,
    encoding: '7bit',
    mimetype,
    size: buffer.length,
    buffer,
    destination: '',
    filename: originalname,
    path: '',
    stream: undefined as never,
  };
}

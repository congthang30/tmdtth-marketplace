import { IsEnum } from 'class-validator';
import { SellerDocumentType } from '@prisma/client';

export class UploadSellerDocumentDto {
  @IsEnum(SellerDocumentType)
  documentType!: SellerDocumentType;
}

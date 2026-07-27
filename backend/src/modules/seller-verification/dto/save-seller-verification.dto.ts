import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { BusinessType, IdentityDocumentType, SellerType } from '@prisma/client';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class SaveSellerVerificationDto {
  @IsEnum(SellerType)
  sellerType!: SellerType;

  @ValidateIf(
    (dto: SaveSellerVerificationDto) => dto.sellerType === SellerType.Business,
  )
  @IsEnum(BusinessType)
  businessType?: BusinessType;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  legalName!: string;

  @ValidateIf(
    (dto: SaveSellerVerificationDto) =>
      dto.sellerType === SellerType.Individual,
  )
  @IsEnum(IdentityDocumentType)
  identityDocumentType?: IdentityDocumentType;

  @ValidateIf(
    (dto: SaveSellerVerificationDto) =>
      dto.sellerType === SellerType.Individual,
  )
  @Transform(trim)
  @IsString()
  @MinLength(9)
  @MaxLength(12)
  @Matches(/^\d{9,12}$/)
  identityNumber?: string;

  @IsOptional()
  @IsDateString()
  identityIssuedAt?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  identityIssuedBy?: string;

  @IsOptional()
  @IsDateString()
  identityExpiresAt?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(600)
  registeredAddress!: string;

  @IsOptional()
  @Transform(trim)
  @Matches(/^\d{10}$/)
  taxCode?: string;

  @ValidateIf(
    (dto: SaveSellerVerificationDto) => dto.sellerType === SellerType.Business,
  )
  @Transform(trim)
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9-]+$/)
  businessRegistrationNumber?: string;

  @IsOptional()
  @IsDateString()
  businessRegistrationIssuedAt?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  businessRegistrationIssuedBy?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  legalRepresentativeName?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  contactName?: string;

  @IsOptional()
  @Transform(trim)
  @IsEmail()
  @MaxLength(255)
  contactEmail?: string;

  @IsOptional()
  @Transform(trim)
  @Matches(/^[0-9+()\-\s]{8,20}$/)
  contactPhone?: string;

  @IsOptional()
  @IsBoolean()
  useAccountPhone?: boolean;
}

export class SaveSellerPayoutAccountDto {
  @Transform(trim)
  @Matches(/^[A-Z0-9_-]{2,30}$/)
  bankCode!: string;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  bankName!: string;

  @Transform(trim)
  @Matches(/^\d{6,20}$/)
  accountNumber!: string;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  accountHolderName!: string;
}

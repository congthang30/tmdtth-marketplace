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
const trimOptional = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const normalized = value.trim();
  return normalized || undefined;
};
const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
const meaningfulName = /^(?=.*\p{L})[\p{L}\p{M}\p{N} .,'&()/-]+$/u;
const meaningfulAddress = /^(?=.*\p{L})[\p{L}\p{M}\p{N}\s.,'()/#-]+$/u;
const registrationNumber = /^(?=.*[A-Za-z0-9])[A-Za-z0-9-]{6,50}$/;
const contactPhone = /^(?=(?:\D*\d){8,15}\D*$)\+?[0-9()\-\s]+$/;

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
  @Matches(meaningfulName)
  legalName!: string;

  @ValidateIf(
    (dto: SaveSellerVerificationDto) =>
      dto.sellerType === SellerType.Individual ||
      dto.businessType === BusinessType.HouseholdBusiness,
  )
  @IsEnum(IdentityDocumentType)
  identityDocumentType?: IdentityDocumentType;

  @ValidateIf(
    (dto: SaveSellerVerificationDto) =>
      dto.sellerType === SellerType.Individual ||
      dto.businessType === BusinessType.HouseholdBusiness,
  )
  @Transform(trim)
  @IsString()
  @MinLength(12)
  @MaxLength(12)
  @Matches(/^\d{12}$/)
  identityNumber?: string;

  @IsOptional()
  @IsDateString()
  identityIssuedAt?: string;

  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(meaningfulName)
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
  @Matches(meaningfulAddress)
  registeredAddress!: string;

  @Transform(trimOptional)
  @IsOptional()
  @Matches(/^\d{10}$/)
  taxCode?: string;

  @ValidateIf(
    (dto: SaveSellerVerificationDto) => dto.sellerType === SellerType.Business,
  )
  @Transform(trim)
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  @Matches(registrationNumber)
  businessRegistrationNumber?: string;

  @IsOptional()
  @IsDateString()
  businessRegistrationIssuedAt?: string;

  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(meaningfulName)
  businessRegistrationIssuedBy?: string;

  @ValidateIf(
    (dto: SaveSellerVerificationDto) =>
      dto.businessType === BusinessType.Company,
  )
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  @Matches(meaningfulName)
  legalRepresentativeName?: string;

  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(meaningfulName)
  contactName?: string;

  @Transform(normalizeEmail)
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  contactEmail?: string;

  @Transform(trimOptional)
  @IsOptional()
  @Matches(contactPhone)
  contactPhone?: string;

  @IsOptional()
  @IsBoolean()
  useAccountPhone?: boolean;
}

export class SaveSellerContactDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(meaningfulName)
  contactName!: string;

  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(255)
  contactEmail!: string;

  @Transform(trim)
  @Matches(contactPhone)
  contactPhone!: string;

  @IsBoolean()
  useAccountPhone!: boolean;
}

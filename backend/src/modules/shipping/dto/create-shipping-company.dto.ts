import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

const companyStatuses = [
  'PendingApproval',
  'Approved',
  'Rejected',
  'Suspended',
  'Inactive',
] as const;

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateShippingCompanyDto {
  @Transform(trimString)
  @IsString()
  @Length(2, 150)
  companyName!: string;

  @Transform(trimString)
  @IsString()
  @Length(2, 180)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @IsOptional()
  @Transform(trimString)
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @Matches(/^[0-9+().\-\s]{7,20}$/)
  phoneNumber?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(50)
  taxCode?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(500)
  addressText?: string;

  @IsOptional()
  @IsIn(companyStatuses)
  companyStatus?: (typeof companyStatuses)[number];
}

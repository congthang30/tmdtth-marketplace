import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { BankTransactionMatchStatus, SellerPayoutStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const trimOptional = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const normalized = value.trim();
  return normalized || undefined;
};
const normalizeBankCode = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;
const normalizeHolderName = ({ value }: { value: unknown }) =>
  typeof value === 'string'
    ? value.trim().normalize('NFKC').replace(/\s+/g, ' ').toUpperCase()
    : value;

export class SavePayoutAccountDto {
  @Transform(normalizeBankCode)
  @IsString()
  @Matches(/^[A-Z0-9_-]{2,30}$/)
  bankCode!: string;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  bankName!: string;

  @Transform(trim)
  @IsString()
  @Matches(/^\d{6,30}$/)
  accountNumber!: string;

  @Transform(normalizeHolderName)
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  @Matches(/^(?=.*\p{L})[\p{L}\p{M}\p{N} .'-]+$/u)
  accountHolderName!: string;
}

export class CreatePayoutDto {
  @Type(() => String)
  @Matches(/^\d+(?:\.\d{1,2})?$/)
  amount!: string;
}

export class SellerPayoutQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(SellerPayoutStatus)
  status?: SellerPayoutStatus;
}

export class AdminPayoutQueryDto extends SellerPayoutQueryDto {
  @IsOptional()
  @Matches(/^\d+$/)
  shopId?: string;
}

export class RejectPayoutDto {
  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;
}

export class ProcessPayoutDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  bankReference!: string;

  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class ManualMatchDto {
  @Matches(/^\d+$/)
  payoutId!: string;

  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;
}

export class FailPayoutDto extends RejectPayoutDto {}

export class AdminBankTransactionQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(BankTransactionMatchStatus)
  matchStatus?: BankTransactionMatchStatus;

  @IsOptional()
  @IsIn(['in', 'out'])
  transferType?: 'in' | 'out';
}

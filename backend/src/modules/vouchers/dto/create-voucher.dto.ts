import { Transform, TransformFnParams, Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  VOUCHER_DISCOUNT_TYPE_FIXED_AMOUNT,
  VOUCHER_DISCOUNT_TYPE_PERCENTAGE,
} from '../types';

const discountTypes = [
  VOUCHER_DISCOUNT_TYPE_PERCENTAGE,
  VOUCHER_DISCOUNT_TYPE_FIXED_AMOUNT,
] as const;

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeVoucherCode({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

export class CreateVoucherDto {
  @Transform(normalizeVoucherCode)
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  @Matches(/^[A-Z0-9]+$/, {
    message: 'voucherCode must contain only uppercase letters and digits',
  })
  voucherCode!: string;

  @Transform(trimString)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  voucherName!: string;

  @IsIn(discountTypes)
  discountType!: (typeof discountTypes)[number];

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  discountValue!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  maxDiscountAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  usageLimit?: number;

  @Type(() => Date)
  @IsDate()
  startAt!: Date;

  @Type(() => Date)
  @IsDate()
  endAt!: Date;
}

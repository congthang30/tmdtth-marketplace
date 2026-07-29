import { Transform, TransformFnParams, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
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
  VOUCHER_DISCOUNT_TARGET_PRODUCT,
  VOUCHER_DISCOUNT_TARGET_SHIPPING,
  VOUCHER_STATUS_ACTIVE,
  VOUCHER_STATUS_INACTIVE,
} from '../types';

const voucherStatuses = [
  VOUCHER_STATUS_ACTIVE,
  VOUCHER_STATUS_INACTIVE,
] as const;
const discountTargets = [
  VOUCHER_DISCOUNT_TARGET_PRODUCT,
  VOUCHER_DISCOUNT_TARGET_SHIPPING,
] as const;

const productScopes = [
  'AllProducts',
  'Categories',
  'SpecificProducts',
] as const;

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class UpdateVoucherDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  voucherName?: string;

  @IsOptional()
  @IsIn(discountTargets)
  discountTarget?: (typeof discountTargets)[number];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @Matches(/^\d+$/, { each: true })
  categoryIds?: string[];

  @IsOptional()
  @IsIn(productScopes)
  productScope?: (typeof productScopes)[number];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @Matches(/^\d+$/, { each: true })
  productIds?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  discountValue?: number;

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

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endAt?: Date;

  @IsOptional()
  @IsIn(voucherStatuses)
  voucherStatus?: (typeof voucherStatuses)[number];
}

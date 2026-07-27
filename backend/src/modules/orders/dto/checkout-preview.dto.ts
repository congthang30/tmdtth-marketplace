import { Transform, TransformFnParams, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeStringInput(value: unknown): unknown {
  if (typeof value === 'number') {
    return String(value);
  }

  return typeof value === 'string' ? value.trim() : value;
}

export class CheckoutShippingSelectionDto {
  @Transform(({ value }) => normalizeStringInput(value))
  @IsString()
  @Matches(/^\d+$/)
  shopId!: string;

  @Transform(({ value }) => normalizeStringInput(value))
  @IsString()
  @Matches(/^\d+$/)
  shippingServiceId!: string;

  @Transform(({ value }) => normalizeStringInput(value))
  @IsString()
  @Matches(/^\d+$/)
  shippingQuoteId!: string;
}

export class ShopVoucherSelectionDto {
  @Transform(({ value }) => normalizeStringInput(value))
  @IsString()
  @Matches(/^\d+$/)
  shopId!: string;

  @Transform(trimString)
  @IsString()
  @MaxLength(50)
  voucherCode!: string;
}

export class CheckoutPreviewDto {
  @Transform(trimString)
  @IsString()
  @Matches(/^\d+$/)
  addressId!: string;

  @Transform(trimString)
  @IsString()
  @Matches(/^\d+$/)
  paymentMethodId!: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @Matches(/^\d+$/, { each: true })
  selectedCartItemIds?: string[];

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(50)
  platformVoucherCode?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ShopVoucherSelectionDto)
  shopVoucherCodes?: ShopVoucherSelectionDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CheckoutShippingSelectionDto)
  shippingSelections?: CheckoutShippingSelectionDto[];
}

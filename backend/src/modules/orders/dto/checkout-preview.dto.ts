import { Transform, TransformFnParams } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
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
  voucherCode?: string;
}

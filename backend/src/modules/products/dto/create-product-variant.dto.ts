import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

const moneyPattern = /^(0|[1-9]\d{0,15})(\.\d{1,2})?$/;

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeStringInput(value: unknown): unknown {
  return typeof value === 'number' ? String(value) : trimString(value);
}

export class CreateProductVariantDto {
  @IsObject()
  attributes!: Record<string, string>;

  @Transform(({ value }) => normalizeStringInput(value))
  @IsString()
  @Matches(moneyPattern)
  price!: string;

  @Transform(({ value }) => normalizeStringInput(value))
  @IsOptional()
  @IsString()
  @Matches(moneyPattern)
  compareAtPrice?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000000)
  weightGram?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000000)
  quantityOnHand!: number;

  @IsOptional()
  @IsIn(['Active', 'Inactive'])
  variantStatus?: 'Active' | 'Inactive';
}

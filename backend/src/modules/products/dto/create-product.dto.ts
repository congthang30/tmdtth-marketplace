import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const idPattern = /^\d+$/;
const moneyPattern = /^(0|[1-9]\d{0,15})(\.\d{1,2})?$/;

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeStringInput(value: unknown): unknown {
  return typeof value === 'number' ? String(value) : trimString(value);
}

export class CreateProductDto {
  @Transform(({ value }) => normalizeStringInput(value))
  @IsString()
  @Matches(idPattern)
  shopId!: string;

  @Transform(({ value }) => normalizeStringInput(value))
  @IsString()
  @Matches(idPattern)
  categoryId!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  productName!: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(150)
  brand?: string;

  @Transform(({ value }) => normalizeStringInput(value))
  @IsString()
  @Matches(moneyPattern)
  basePrice!: string;

  @Transform(({ value }) => normalizeStringInput(value))
  @IsOptional()
  @IsString()
  @Matches(moneyPattern)
  compareAtPrice?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1200)
  warrantyMonths?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000000)
  weightGram?: number;

  @IsOptional()
  @IsIn(['Draft', 'Published'])
  productStatus?: 'Draft' | 'Published';
}

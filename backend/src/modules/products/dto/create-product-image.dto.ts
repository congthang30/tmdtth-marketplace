import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const idPattern = /^\d+$/;

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeStringInput(value: unknown): unknown {
  return typeof value === 'number' ? String(value) : trimString(value);
}

export class CreateProductImageDto {
  @Transform(({ value }) => normalizeStringInput(value))
  @IsOptional()
  @IsString()
  @Matches(idPattern)
  productVariantId?: string;

  @Transform(({ value }) => normalizeStringInput(value))
  @IsString()
  @Matches(idPattern)
  assetId!: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(255)
  altText?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isThumbnail?: boolean;
}

import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const idPattern = /^\d+$/;

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeStringInput(value: unknown): unknown {
  if (typeof value === 'number') {
    return String(value);
  }

  return typeof value === 'string' ? value.trim() : value;
}

export class CreateProductReviewDto {
  @Transform(({ value }) => normalizeStringInput(value))
  @IsString()
  @Matches(idPattern)
  orderItemId!: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(255)
  reviewTitle?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(2000)
  reviewContent?: string;
}

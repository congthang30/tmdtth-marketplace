import { Transform, TransformFnParams, Type } from 'class-transformer';
import {
  IsInt,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
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

export class CreateShippingQuoteDto {
  @Transform(({ value }) => normalizeStringInput(value))
  @IsString()
  @Matches(idPattern)
  shopId!: string;

  @Transform(({ value }) => normalizeStringInput(value))
  @IsString()
  @Matches(idPattern)
  shippingServiceId!: string;

  @Transform(trimString)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  destinationProvince!: string;

  @Transform(trimString)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  destinationWard!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000000)
  totalWeightGram!: number;
}

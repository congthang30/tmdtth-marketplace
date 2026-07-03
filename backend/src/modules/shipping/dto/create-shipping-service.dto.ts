import { Transform, TransformFnParams, Type } from 'class-transformer';
import {
  IsBoolean,
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
const serviceCodePattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,49}$/;

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeStringInput(value: unknown): unknown {
  if (typeof value === 'number') {
    return String(value);
  }

  return typeof value === 'string' ? value.trim() : value;
}

export class CreateShippingServiceDto {
  @Transform(({ value }) => normalizeStringInput(value))
  @IsString()
  @Matches(idPattern)
  shippingCompanyId!: string;

  @Transform(trimString)
  @IsString()
  @Matches(serviceCodePattern)
  @MaxLength(50)
  serviceCode!: string;

  @Transform(trimString)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  serviceName!: string;

  @Transform(({ value }) => normalizeStringInput(value))
  @IsString()
  @Matches(moneyPattern)
  baseFee!: string;

  @IsOptional()
  @Transform(({ value }) => normalizeStringInput(value))
  @IsString()
  @Matches(moneyPattern)
  feePerKg?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  estimatedMinDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  estimatedMaxDays?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

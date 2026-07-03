import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const idPattern = /^\d+$/;
const trackingPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeStringInput(value: unknown): unknown {
  if (typeof value === 'number') {
    return String(value);
  }

  return typeof value === 'string' ? value.trim() : value;
}

export class CreateShipmentDto {
  @Transform(({ value }) => normalizeStringInput(value))
  @IsString()
  @Matches(idPattern)
  shippingServiceId!: string;

  @IsOptional()
  @Transform(({ value }) => normalizeStringInput(value))
  @IsString()
  @Matches(idPattern)
  shippingQuoteId?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @Matches(trackingPattern)
  trackingNumber?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(500)
  pickupAddress?: string;

  @IsOptional()
  @IsDateString()
  expectedDeliveryAt?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(1000)
  note?: string;
}

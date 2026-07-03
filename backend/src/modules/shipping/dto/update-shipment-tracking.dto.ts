import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const trackingPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const shipmentStatuses = ['PickedUp', 'InTransit', 'Delivered'] as const;

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class UpdateShipmentTrackingDto {
  @IsString()
  @IsIn(shipmentStatuses)
  shipmentStatus!: (typeof shipmentStatuses)[number];

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @Matches(trackingPattern)
  trackingNumber?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(255)
  locationText?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(1000)
  note?: string;
}

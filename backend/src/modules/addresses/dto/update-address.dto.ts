import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class UpdateAddressDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @Length(2, 150)
  receiverName?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @Matches(/^[0-9+()\-\s]{8,20}$/)
  phoneNumber?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @Length(2, 100)
  province?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @Length(2, 100)
  ward?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @Length(2, 255)
  streetAddress?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(600)
  fullAddress?: string | null;
}

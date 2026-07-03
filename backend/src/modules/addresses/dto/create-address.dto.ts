import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateAddressDto {
  @Transform(trimString)
  @IsString()
  @Length(2, 150)
  receiverName!: string;

  @Transform(trimString)
  @IsString()
  @Matches(/^[0-9+()\-\s]{8,20}$/)
  phoneNumber!: string;

  @Transform(trimString)
  @IsString()
  @Length(2, 100)
  province!: string;

  @Transform(trimString)
  @IsString()
  @Length(2, 100)
  district!: string;

  @Transform(trimString)
  @IsString()
  @Length(2, 100)
  ward!: string;

  @Transform(trimString)
  @IsString()
  @Length(2, 255)
  streetAddress!: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(600)
  fullAddress?: string | null;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

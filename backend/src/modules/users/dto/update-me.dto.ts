import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsDateString,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class UpdateMeDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @Length(2, 150)
  fullName?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(1000)
  avatarUrl?: string | null;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(20)
  gender?: string | null;

  @IsOptional()
  @Transform(trimString)
  @IsDateString()
  dateOfBirth?: string | null;
}

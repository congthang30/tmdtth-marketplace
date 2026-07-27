import { Transform, TransformFnParams } from 'class-transformer';
import { IsNumberString, IsOptional, IsString, Matches } from 'class-validator';

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class AvailableVoucherQueryDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @Matches(/^\d+$/)
  shopId?: string;

  @IsOptional()
  @Transform(trimString)
  @IsNumberString()
  subtotal?: string;
}

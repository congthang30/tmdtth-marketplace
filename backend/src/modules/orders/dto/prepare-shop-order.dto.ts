import { Transform, TransformFnParams } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class PrepareShopOrderDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(1000)
  sellerNote?: string;
}

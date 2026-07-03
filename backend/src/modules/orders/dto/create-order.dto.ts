import { Transform, TransformFnParams } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CheckoutPreviewDto } from './checkout-preview.dto';

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateOrderDto extends CheckoutPreviewDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(1000)
  customerNote?: string;
}

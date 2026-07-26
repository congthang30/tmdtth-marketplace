import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class RejectShopDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;
}

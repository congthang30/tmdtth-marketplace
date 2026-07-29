import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PauseShopIndefinitelyDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

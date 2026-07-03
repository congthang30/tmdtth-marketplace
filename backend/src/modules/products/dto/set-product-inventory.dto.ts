import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class SetProductInventoryDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000000)
  quantityOnHand!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000)
  lowStockThreshold?: number;
}

import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

function normalizeStringInput(value: unknown): unknown {
  if (typeof value === 'number') {
    return String(value);
  }

  return typeof value === 'string' ? value.trim() : value;
}

export class ActiveShippingServiceQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }) => normalizeStringInput(value))
  @IsString()
  @Matches(/^\d+$/)
  shopId?: string;
}

import { Transform, TransformFnParams } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

const shopStatuses = ['PendingApproval', 'Approved', 'Rejected'] as const;

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class AdminShopQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(trimString)
  @IsIn(shopStatuses)
  status?: (typeof shopStatuses)[number];
}

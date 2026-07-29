import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

const ADMIN_PRODUCT_STATUSES = [
  'Draft',
  'PendingApproval',
  'Published',
  'Rejected',
] as const;

export class AdminProductQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(ADMIN_PRODUCT_STATUSES)
  status?: (typeof ADMIN_PRODUCT_STATUSES)[number];
}

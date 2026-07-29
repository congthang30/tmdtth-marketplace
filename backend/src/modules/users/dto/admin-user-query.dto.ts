import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class AdminUserQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['all', 'seller', 'customer'])
  type?: 'all' | 'seller' | 'customer' = 'all';

  @IsOptional()
  @IsIn(['Active', 'Suspended'])
  status?: 'Active' | 'Suspended';
}

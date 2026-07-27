import { Transform, TransformFnParams } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { VOUCHER_STATUS_ACTIVE, VOUCHER_STATUS_INACTIVE } from '../types';

const voucherStatuses = [VOUCHER_STATUS_ACTIVE, VOUCHER_STATUS_INACTIVE] as const;

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class VoucherQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(trimString)
  @IsIn(voucherStatuses)
  status?: (typeof voucherStatuses)[number];
}

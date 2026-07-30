import { SellerLedgerEntryType } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, Matches } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class SellerLedgerQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(SellerLedgerEntryType)
  entryType?: SellerLedgerEntryType;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class AdminSellerLedgerQueryDto extends SellerLedgerQueryDto {
  @IsOptional()
  @Matches(/^\d+$/)
  shopId?: string;
}

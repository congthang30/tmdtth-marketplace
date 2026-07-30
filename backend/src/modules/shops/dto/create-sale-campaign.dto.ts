import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

const moneyPattern = /^(0|[1-9]\d{0,15})(\.\d{1,2})?$/;

export class SaleCampaignItemDto {
  @Transform(({ value }) => String(value).trim())
  @IsString()
  @Matches(/^\d+$/)
  productVariantId!: string;

  @Transform(({ value }) => String(value).trim())
  @IsString()
  @Matches(moneyPattern)
  salePrice!: string;
}

export class CreateSaleCampaignDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  campaignName!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsIn(['Draft', 'Scheduled'])
  status!: 'Draft' | 'Scheduled';

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleCampaignItemDto)
  items!: SaleCampaignItemDto[];
}

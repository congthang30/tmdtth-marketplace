import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const trimOptional = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const normalized = value.trim();
  return normalized || undefined;
};
const normalizeTransactionDate = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const normalized = value.trim();
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)
    ? `${normalized.replace(' ', 'T')}+07:00`
    : normalized;
};
const optionalNumberString = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') return String(value);
  return typeof value === 'string' ? value.trim() : value;
};

export class SepayWebhookDto {
  @Type(() => String)
  @Matches(/^\d+$/)
  id!: string;

  @Transform(trim)
  @IsString()
  @MaxLength(50)
  gateway!: string;

  @Transform(trim)
  @IsString()
  @MaxLength(100)
  accountNumber!: string;

  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  subAccount?: string;

  @IsIn(['in', 'out'])
  transferType!: 'in' | 'out';

  @Type(() => String)
  @Matches(/^\d+(?:\.\d{1,2})?$/)
  transferAmount!: string;

  @Transform(normalizeTransactionDate)
  @IsDateString()
  transactionDate!: string;

  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  code?: string;

  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  content?: string;

  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @Transform(optionalNumberString)
  @IsOptional()
  @Matches(/^-?\d+(?:\.\d{1,2})?$/)
  accumulated?: string;

  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MaxLength(150)
  referenceCode?: string;
}

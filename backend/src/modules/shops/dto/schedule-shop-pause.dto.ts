import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class ScheduleShopPauseDto {
  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

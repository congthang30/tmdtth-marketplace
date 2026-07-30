import { Matches } from 'class-validator';

export class FinanceIdParamDto {
  @Matches(/^[1-9]\d*$/)
  id!: string;
}

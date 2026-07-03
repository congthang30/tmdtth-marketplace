import { PartialType } from '@nestjs/swagger';
import { CreateShippingCompanyDto } from './create-shipping-company.dto';

export class UpdateShippingCompanyDto extends PartialType(
  CreateShippingCompanyDto,
) {}

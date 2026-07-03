import { PartialType } from '@nestjs/swagger';
import { CreateShippingServiceDto } from './create-shipping-service.dto';

export class UpdateShippingServiceDto extends PartialType(
  CreateShippingServiceDto,
) {}

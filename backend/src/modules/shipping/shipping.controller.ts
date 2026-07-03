import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AppRole } from '../auth/app-role.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateShippingQuoteDto } from './dto/create-shipping-quote.dto';
import { ShippingService } from './shipping.service';

@Controller('shipping')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.Customer)
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Post('quotes')
  createShippingQuote(@Body() dto: CreateShippingQuoteDto) {
    return this.shippingService.createShippingQuote(dto);
  }
}

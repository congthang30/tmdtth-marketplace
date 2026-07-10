import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AppRole } from '../auth/app-role.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ActiveShippingServiceQueryDto } from './dto/active-shipping-service-query.dto';
import { CreateShippingQuoteDto } from './dto/create-shipping-quote.dto';
import { ShippingService } from './shipping.service';

@Controller('shipping')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get('services')
  @Roles(AppRole.Customer, AppRole.Seller)
  listActiveShippingServices(@Query() query: ActiveShippingServiceQueryDto) {
    return this.shippingService.listActiveShippingServices(query);
  }

  @Post('quotes')
  @Roles(AppRole.Customer)
  createShippingQuote(@Body() dto: CreateShippingQuoteDto) {
    return this.shippingService.createShippingQuote(dto);
  }
}

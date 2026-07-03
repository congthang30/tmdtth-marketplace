import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AppRole } from '../auth/app-role.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateShippingServiceDto } from './dto/create-shipping-service.dto';
import { ShippingServiceQueryDto } from './dto/shipping-service-query.dto';
import { UpdateShippingServiceDto } from './dto/update-shipping-service.dto';
import { ShippingService } from './shipping.service';

@Controller('admin/shipping-services')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.Admin)
export class AdminShippingServicesController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get()
  listShippingServices(@Query() query: ShippingServiceQueryDto) {
    return this.shippingService.listShippingServices(query);
  }

  @Get(':id')
  getShippingService(@Param('id') shippingServiceId: string) {
    return this.shippingService.getShippingService(shippingServiceId);
  }

  @Post()
  createShippingService(@Body() dto: CreateShippingServiceDto) {
    return this.shippingService.createShippingService(dto);
  }

  @Patch(':id')
  updateShippingService(
    @Param('id') shippingServiceId: string,
    @Body() dto: UpdateShippingServiceDto,
  ) {
    return this.shippingService.updateShippingService(shippingServiceId, dto);
  }

  @Delete(':id')
  deactivateShippingService(@Param('id') shippingServiceId: string) {
    return this.shippingService.deactivateShippingService(shippingServiceId);
  }
}

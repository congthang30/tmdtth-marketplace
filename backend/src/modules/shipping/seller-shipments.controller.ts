import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AppRole } from '../auth/app-role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { HandoverStationsQueryDto } from './dto/handover-stations-query.dto';
import { ShippingService } from './shipping.service';

@Controller('seller/orders/:shopOrderId/shipments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.Seller)
export class SellerShipmentsController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get('handover-stations')
  listHandoverStations(
    @CurrentUser() user: AuthenticatedUser,
    @Param('shopOrderId') shopOrderId: string,
    @Query() query: HandoverStationsQueryDto,
  ) {
    return this.shippingService.listSellerHandoverStations(
      user,
      shopOrderId,
      query,
    );
  }

  @Post()
  createSellerShipment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('shopOrderId') shopOrderId: string,
    @Body() dto: CreateShipmentDto,
  ) {
    return this.shippingService.createSellerShipment(user, shopOrderId, dto);
  }

  @Post(':shipmentId/sync')
  syncSellerShipment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('shopOrderId') shopOrderId: string,
    @Param('shipmentId') shipmentId: string,
  ) {
    return this.shippingService.syncSellerShipment(
      user,
      shopOrderId,
      shipmentId,
    );
  }

  @Post(':shipmentId/label')
  createShipmentLabel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('shopOrderId') shopOrderId: string,
    @Param('shipmentId') shipmentId: string,
  ) {
    return this.shippingService.getSellerShipmentLabel(
      user,
      shopOrderId,
      shipmentId,
    );
  }
}

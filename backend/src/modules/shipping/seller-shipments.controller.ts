import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AppRole } from '../auth/app-role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentTrackingDto } from './dto/update-shipment-tracking.dto';
import { ShippingService } from './shipping.service';

@Controller('seller/orders/:shopOrderId/shipments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.Seller)
export class SellerShipmentsController {
  constructor(private readonly shippingService: ShippingService) {}

  @Post()
  createSellerShipment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('shopOrderId') shopOrderId: string,
    @Body() dto: CreateShipmentDto,
  ) {
    return this.shippingService.createSellerShipment(user, shopOrderId, dto);
  }

  @Patch(':shipmentId/tracking')
  updateSellerShipmentTracking(
    @CurrentUser() user: AuthenticatedUser,
    @Param('shopOrderId') shopOrderId: string,
    @Param('shipmentId') shipmentId: string,
    @Body() dto: UpdateShipmentTrackingDto,
  ) {
    return this.shippingService.updateSellerShipmentTracking(
      user,
      shopOrderId,
      shipmentId,
      dto,
    );
  }

  /**
   * Retries registering the shipment with its carrier (GHN/GHTK) when the
   * initial createSellerShipment call succeeded locally but the carrier
   * order-creation call failed (e.g. carrier API was down). Also refreshes
   * the cached carrier status when the shipment is already registered.
   */
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
}

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AdminShippingProvidersController } from './admin-shipping-providers.controller';
import { CarrierRegistry } from './carriers/carrier.registry';
import { GhnAddressResolver } from './carriers/ghn-address.resolver';
import { GhnClient } from './carriers/ghn.client';
import { SellerShipmentsController } from './seller-shipments.controller';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    ShippingController,
    SellerShipmentsController,
    AdminShippingProvidersController,
  ],
  providers: [ShippingService, CarrierRegistry, GhnClient, GhnAddressResolver],
})
export class ShippingModule {}

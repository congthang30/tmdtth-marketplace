import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AdminShippingCompaniesController } from './admin-shipping-companies.controller';
import { AdminShippingServicesController } from './admin-shipping-services.controller';
import { SellerShipmentsController } from './seller-shipments.controller';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    ShippingController,
    SellerShipmentsController,
    AdminShippingCompaniesController,
    AdminShippingServicesController,
  ],
  providers: [ShippingService],
})
export class ShippingModule {}

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AdminShopsController } from './admin-shops.controller';
import { SellerShopCategoriesController } from './seller-shop-categories.controller';
import { SellerSaleCampaignsController } from './seller-sale-campaigns.controller';
import { SaleCampaignsService } from './sale-campaigns.service';
import { ShopsController } from './shops.controller';
import { ShopsService } from './shops.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    ShopsController,
    AdminShopsController,
    SellerShopCategoriesController,
    SellerSaleCampaignsController,
  ],
  providers: [ShopsService, SaleCampaignsService],
})
export class ShopsModule {}

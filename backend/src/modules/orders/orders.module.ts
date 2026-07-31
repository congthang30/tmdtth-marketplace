import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { VouchersModule } from '../vouchers/vouchers.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { SellerOrdersController } from './seller-orders.controller';

@Module({
  imports: [PrismaModule, AuthModule, VouchersModule],
  controllers: [OrdersController, SellerOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

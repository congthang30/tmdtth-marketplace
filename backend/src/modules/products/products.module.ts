import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { SellerProductsController } from './seller-products.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ProductsController, SellerProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}

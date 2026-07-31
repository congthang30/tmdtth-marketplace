import { Module } from '@nestjs/common';
import { AddressesModule } from './modules/addresses/addresses.module';
import { AuthModule } from './modules/auth/auth.module';
import { CartModule } from './modules/cart/cart.module';
import { ChatModule } from './modules/chat/chat.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { FinanceModule } from './modules/finance/finance.module';
import { HealthModule } from './modules/health/health.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ProductsModule } from './modules/products/products.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { SearchModule } from './modules/search/search.module';
import { ShopsModule } from './modules/shops/shops.module';
import { SellerVerificationModule } from './modules/seller-verification/seller-verification.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { UploadModule } from './modules/upload/upload.module';
import { UsersModule } from './modules/users/users.module';
import { VouchersModule } from './modules/vouchers/vouchers.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    HealthModule,
    AuthModule,
    ChatModule,
    UsersModule,
    AddressesModule,
    CategoriesModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    FinanceModule,
    PaymentsModule,
    ShopsModule,
    SellerVerificationModule,
    ShippingModule,
    ReviewsModule,
    UploadModule,
    VouchersModule,
    SearchModule,
  ],
})
export class AppModule {}

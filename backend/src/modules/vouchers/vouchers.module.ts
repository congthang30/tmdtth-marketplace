import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminVouchersController } from './admin-vouchers.controller';
import { PublicVouchersController } from './public-vouchers.controller';
import { SellerVouchersController } from './seller-vouchers.controller';
import { VouchersService } from './vouchers.service';

@Module({
  imports: [AuthModule],
  controllers: [
    AdminVouchersController,
    SellerVouchersController,
    PublicVouchersController,
  ],
  providers: [VouchersService],
  exports: [VouchersService],
})
export class VouchersModule {}

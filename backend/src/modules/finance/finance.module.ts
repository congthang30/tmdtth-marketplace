import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SellerVerificationModule } from '../seller-verification/seller-verification.module';
import { AdminFinanceController } from './admin-finance.controller';
import { PayoutService } from './payout.service';
import { SellerFinanceController } from './seller-finance.controller';
import { SellerLedgerService } from './seller-ledger.service';
import { SepayWebhookController } from './sepay-webhook.controller';
import { SepayWebhookService } from './sepay-webhook.service';

@Module({
  imports: [AuthModule, SellerVerificationModule],
  controllers: [
    SellerFinanceController,
    AdminFinanceController,
    SepayWebhookController,
  ],
  providers: [SellerLedgerService, PayoutService, SepayWebhookService],
  exports: [SellerLedgerService, PayoutService],
})
export class FinanceModule {}

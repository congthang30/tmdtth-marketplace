import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AdminSellerVerificationController } from './admin-seller-verification.controller';
import { AdminSellerVerificationService } from './admin-seller-verification.service';
import { SellerDataCryptoService } from './seller-data-crypto.service';
import { SellerDocumentStorageService } from './seller-document-storage.service';
import { SellerDocumentValidatorService } from './seller-document-validator.service';
import { SellerVerificationController } from './seller-verification.controller';
import { SellerVerificationService } from './seller-verification.service';
import { VerificationTransitionService } from './verification-transition.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    SellerVerificationController,
    AdminSellerVerificationController,
  ],
  providers: [
    AdminSellerVerificationService,
    SellerDataCryptoService,
    SellerDocumentStorageService,
    SellerDocumentValidatorService,
    SellerVerificationService,
    VerificationTransitionService,
  ],
  exports: [SellerVerificationService],
})
export class SellerVerificationModule {}

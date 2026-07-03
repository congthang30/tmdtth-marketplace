import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PublicProductReviewsController } from './public-product-reviews.controller';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ReviewsController, PublicProductReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}

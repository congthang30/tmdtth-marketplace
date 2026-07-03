import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AppRole } from '../auth/app-role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types';
import { CreateProductReviewDto } from './dto/create-product-review.dto';
import { ReviewsService } from './reviews.service';

@Controller('reviews/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.Customer)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  createProductReview(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProductReviewDto,
  ) {
    return this.reviewsService.createProductReview(user, dto);
  }
}

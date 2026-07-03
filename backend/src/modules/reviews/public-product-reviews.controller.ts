import { Controller, Get, Param, Query } from '@nestjs/common';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ReviewsService } from './reviews.service';

@Controller('products/:slug/reviews')
export class PublicProductReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  listPublicProductReviews(
    @Param('slug') productSlug: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.reviewsService.listPublicProductReviews(productSlug, query);
  }
}

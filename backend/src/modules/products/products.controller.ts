import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductListQueryDto } from './dto/product-list-query.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  listPublicProducts(@Query() query: ProductListQueryDto) {
    return this.productsService.listPublicProducts(query);
  }

  @Get('discovery/top-searched')
  listTopSearchedProducts(@Query('limit') limit?: string) {
    return this.productsService.listTopSearchedProducts(
      Math.min(12, Math.max(1, Number(limit) || 6)),
    );
  }

  @Get(':slug/check-variant')
  checkPublicProductVariant(
    @Param('slug') slug: string,
    @Query('attributes') attributes = '{}',
  ) {
    return this.productsService.checkPublicProductVariant(slug, attributes);
  }

  @Get(':slug')
  getPublicProductDetail(@Param('slug') slug: string) {
    return this.productsService.getPublicProductDetail(slug);
  }
}

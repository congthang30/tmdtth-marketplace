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

  @Get(':slug')
  getPublicProductDetail(@Param('slug') slug: string) {
    return this.productsService.getPublicProductDetail(slug);
  }
}

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

  @Get(':slug')
  getPublicProductDetail(@Param('slug') slug: string) {
    return this.productsService.getPublicProductDetail(slug);
  }
}

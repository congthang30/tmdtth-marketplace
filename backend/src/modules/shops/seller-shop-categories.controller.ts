import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types';
import { AssignShopCategoryProductsDto } from './dto/assign-shop-category-products.dto';
import { UpsertShopCategoryDto } from './dto/upsert-shop-category.dto';
import { ShopsService } from './shops.service';

@Controller('seller/shop-categories')
@UseGuards(JwtAuthGuard)
export class SellerShopCategoriesController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.shopsService.listOwnedShopCategories(user);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertShopCategoryDto,
  ) {
    return this.shopsService.createOwnedShopCategory(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpsertShopCategoryDto,
  ) {
    return this.shopsService.updateOwnedShopCategory(user, id, dto);
  }

  @Put(':id/products')
  assignProducts(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AssignShopCategoryProductsDto,
  ) {
    return this.shopsService.assignOwnedShopCategoryProducts(
      user,
      id,
      dto.productIds,
    );
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.shopsService.deleteOwnedShopCategory(user, id);
  }
}

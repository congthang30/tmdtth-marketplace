import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types';
import { CreateShopDto } from './dto/create-shop.dto';
import { ShopCatalogQueryDto } from './dto/shop-catalog-query.dto';
import { ShopsService } from './shops.service';

@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMyShop(@CurrentUser() user: AuthenticatedUser) {
    return this.shopsService.getMyShop(user);
  }

  @Get(':slug')
  getPublicShop(@Param('slug') slug: string, @Query() query: ShopCatalogQueryDto) {
    return this.shopsService.getPublicShopCatalog(slug, query);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  createShop(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateShopDto,
  ) {
    return this.shopsService.createShop(user, dto);
  }
}

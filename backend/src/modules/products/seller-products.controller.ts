import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AppRole } from '../auth/app-role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types';
import { AdjustDamagedInventoryDto } from './dto/adjust-damaged-inventory.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { ReceiveProductInventoryDto } from './dto/set-product-inventory.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { ProductsService } from './products.service';

@Controller('seller/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.Seller)
export class SellerProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  listSellerProducts(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.productsService.listSellerProducts(user, query);
  }

  @Post()
  createSellerProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.createSellerProduct(user, dto);
  }

  @Patch(':id')
  updateSellerProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') productId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.updateSellerProduct(user, productId, dto);
  }

  @Delete(':id')
  deleteSellerProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') productId: string,
  ) {
    return this.productsService.deleteSellerProduct(user, productId);
  }

  @Get(':productId/variants')
  listSellerProductVariants(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
  ) {
    return this.productsService.listSellerProductVariants(user, productId);
  }

  @Post(':productId/variants')
  createSellerProductVariant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
    @Body() dto: CreateProductVariantDto,
  ) {
    return this.productsService.createSellerProductVariant(
      user,
      productId,
      dto,
    );
  }

  @Patch(':productId/variants/:variantId')
  updateSellerProductVariant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateProductVariantDto,
  ) {
    return this.productsService.updateSellerProductVariant(
      user,
      productId,
      variantId,
      dto,
    );
  }

  @Delete(':productId/variants/:variantId')
  deleteSellerProductVariant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
  ) {
    return this.productsService.deleteSellerProductVariant(
      user,
      productId,
      variantId,
    );
  }

  @Get(':productId/images')
  listSellerProductImages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
  ) {
    return this.productsService.listSellerProductImages(user, productId);
  }

  @Post(':productId/images')
  createSellerProductImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
    @Body() dto: CreateProductImageDto,
  ) {
    return this.productsService.createSellerProductImage(user, productId, dto);
  }

  @Patch(':productId/images/:imageId')
  updateSellerProductImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
    @Body() dto: UpdateProductImageDto,
  ) {
    return this.productsService.updateSellerProductImage(
      user,
      productId,
      imageId,
      dto,
    );
  }

  @Delete(':productId/images/:imageId')
  deleteSellerProductImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.productsService.deleteSellerProductImage(
      user,
      productId,
      imageId,
    );
  }

  @Get(':productId/variants/:variantId/inventory')
  getSellerVariantInventory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
  ) {
    return this.productsService.getSellerVariantInventory(
      user,
      productId,
      variantId,
    );
  }

  @Get(':productId/variants/:variantId/inventory/transactions')
  listSellerVariantInventoryTransactions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.productsService.listSellerVariantInventoryTransactions(
      user,
      productId,
      variantId,
      query,
    );
  }

  @Patch(':productId/variants/:variantId/inventory')
  receiveSellerVariantInventory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @Body() dto: ReceiveProductInventoryDto,
  ) {
    return this.productsService.receiveSellerVariantInventory(
      user,
      productId,
      variantId,
      dto,
    );
  }
  @Post(':productId/variants/:variantId/inventory/damaged')
  markSellerVariantInventoryDamaged(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @Body() dto: AdjustDamagedInventoryDto,
  ) {
    return this.productsService.markSellerVariantInventoryDamaged(
      user,
      productId,
      variantId,
      dto,
    );
  }

  @Post(':productId/variants/:variantId/inventory/damaged/dispose')
  disposeSellerVariantDamagedInventory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @Body() dto: AdjustDamagedInventoryDto,
  ) {
    return this.productsService.disposeSellerVariantDamagedInventory(
      user,
      productId,
      variantId,
      dto,
    );
  }
}

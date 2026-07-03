import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { ConfirmShopOrderDto } from './dto/confirm-shop-order.dto';
import { PrepareShopOrderDto } from './dto/prepare-shop-order.dto';
import { OrdersService } from './orders.service';

@Controller('seller/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.Seller)
export class SellerOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  listSellerShopOrders(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.ordersService.listSellerShopOrders(user, query);
  }

  @Get(':id')
  getSellerShopOrderDetail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') shopOrderId: string,
  ) {
    return this.ordersService.getSellerShopOrderDetail(user, shopOrderId);
  }

  @Patch(':id/confirm')
  confirmSellerShopOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') shopOrderId: string,
    @Body() dto: ConfirmShopOrderDto,
  ) {
    return this.ordersService.confirmSellerShopOrder(user, shopOrderId, dto);
  }

  @Patch(':id/prepare')
  prepareSellerShopOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') shopOrderId: string,
    @Body() dto: PrepareShopOrderDto,
  ) {
    return this.ordersService.prepareSellerShopOrder(user, shopOrderId, dto);
  }
}

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types';
import { CheckoutPreviewDto } from './dto/checkout-preview.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('my')
  listMyOrders(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.ordersService.listMyOrders(user, query);
  }

  @Get(':id')
  getMyOrderDetail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') orderId: string,
  ) {
    return this.ordersService.getMyOrderDetail(user, orderId);
  }

  @Post('checkout-preview')
  @HttpCode(HttpStatus.OK)
  checkoutPreview(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CheckoutPreviewDto,
  ) {
    return this.ordersService.checkoutPreview(user, dto);
  }

  @Post()
  createOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(user, dto);
  }

  @Patch(':id/cancel')
  cancelMyOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') orderId: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.ordersService.cancelMyOrder(user, orderId, dto);
  }
}

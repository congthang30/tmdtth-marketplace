import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getMyCart(@CurrentUser() user: AuthenticatedUser) {
    return this.cartService.getMyCart(user);
  }

  @Post('items')
  addItem(@CurrentUser() user: AuthenticatedUser, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(user, dto);
  }

  @Patch('items/:id')
  updateItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') cartItemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(user, cartItemId, dto);
  }

  @Patch('items/:id/select')
  selectItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') cartItemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.selectItem(user, cartItemId, dto);
  }

  @Delete('items/:id')
  deleteItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') cartItemId: string,
  ) {
    return this.cartService.deleteItem(user, cartItemId);
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AppRole } from '../auth/app-role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { VoucherQueryDto } from './dto/voucher-query.dto';
import { VouchersService } from './vouchers.service';

@Controller('seller/vouchers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.Seller)
export class SellerVouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Get()
  listVouchers(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: VoucherQueryDto,
  ) {
    return this.vouchersService.listShopVouchers(user, query);
  }

  @Post()
  createVoucher(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateVoucherDto,
  ) {
    return this.vouchersService.createShopVoucher(user, dto);
  }

  @Patch(':id')
  updateVoucher(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateVoucherDto,
  ) {
    return this.vouchersService.updateShopVoucher(user, id, dto);
  }

  @Patch(':id/deactivate')
  deactivateVoucher(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.vouchersService.deactivateShopVoucher(user, id);
  }
}

import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AppRole } from '../auth/app-role.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { VoucherQueryDto } from './dto/voucher-query.dto';
import { VouchersService } from './vouchers.service';

@Controller('admin/vouchers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.Admin)
export class AdminVouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Get()
  listVouchers(@Query() query: VoucherQueryDto) {
    return this.vouchersService.listPlatformVouchers(query);
  }

  @Post()
  createVoucher(@Body() dto: CreateVoucherDto) {
    return this.vouchersService.createPlatformVoucher(dto);
  }

  @Patch(':id')
  updateVoucher(@Param('id') id: string, @Body() dto: UpdateVoucherDto) {
    return this.vouchersService.updatePlatformVoucher(id, dto);
  }

  @Patch(':id/deactivate')
  deactivateVoucher(@Param('id') id: string) {
    return this.vouchersService.deactivatePlatformVoucher(id);
  }
}

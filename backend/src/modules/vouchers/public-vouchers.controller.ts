import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types';
import { AvailableVoucherQueryDto } from './dto/available-voucher-query.dto';
import { VouchersService } from './vouchers.service';

@Controller('vouchers')
@UseGuards(JwtAuthGuard)
export class PublicVouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Get('available')
  listAvailableVouchers(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AvailableVoucherQueryDto,
  ) {
    return this.vouchersService.listAvailableVouchers(user, query);
  }
}

import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { AppRole } from '../auth/app-role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types';
import { RejectShopDto } from './dto/reject-shop.dto';
import { ShopsService } from './shops.service';

@Controller('admin/shops')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.Admin)
export class AdminShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Patch(':id/approve')
  approveShop(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') shopId: string,
  ) {
    return this.shopsService.approveShop(user, shopId);
  }

  @Patch(':id/reject')
  rejectShop(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') shopId: string,
    @Body() dto: RejectShopDto,
  ) {
    void dto;

    return this.shopsService.rejectShop(user, shopId);
  }
}

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
import { CreateShippingCompanyDto } from './dto/create-shipping-company.dto';
import { UpdateShippingCompanyDto } from './dto/update-shipping-company.dto';
import { ShippingService } from './shipping.service';

@Controller('admin/shipping-companies')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.Admin)
export class AdminShippingCompaniesController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get()
  listShippingCompanies(@Query() query: PaginationQueryDto) {
    return this.shippingService.listShippingCompanies(query);
  }

  @Get(':id')
  getShippingCompany(@Param('id') shippingCompanyId: string) {
    return this.shippingService.getShippingCompany(shippingCompanyId);
  }

  @Post()
  createShippingCompany(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateShippingCompanyDto,
  ) {
    return this.shippingService.createShippingCompany(user, dto);
  }

  @Patch(':id')
  updateShippingCompany(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') shippingCompanyId: string,
    @Body() dto: UpdateShippingCompanyDto,
  ) {
    return this.shippingService.updateShippingCompany(
      user,
      shippingCompanyId,
      dto,
    );
  }

  @Delete(':id')
  deleteShippingCompany(@Param('id') shippingCompanyId: string) {
    return this.shippingService.deleteShippingCompany(shippingCompanyId);
  }
}

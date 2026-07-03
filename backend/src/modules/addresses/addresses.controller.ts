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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  listMyAddresses(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.addressesService.listMyAddresses(user, query);
  }

  @Post()
  createAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAddressDto,
  ) {
    return this.addressesService.createAddress(user, dto);
  }

  @Patch(':id')
  updateAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.updateAddress(user, addressId, dto);
  }

  @Delete(':id')
  deleteAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') addressId: string,
  ) {
    return this.addressesService.deleteAddress(user, addressId);
  }

  @Patch(':id/default')
  setDefaultAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') addressId: string,
  ) {
    return this.addressesService.setDefaultAddress(user, addressId);
  }
}

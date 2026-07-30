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
import { CreateShopDto } from './dto/create-shop.dto';
import { PauseShopIndefinitelyDto } from './dto/pause-shop-indefinitely.dto';
import { ScheduleShopPauseDto } from './dto/schedule-shop-pause.dto';
import { ShopCatalogQueryDto } from './dto/shop-catalog-query.dto';
import { UpdateShopProfileDto } from './dto/update-shop-profile.dto';
import { ShopsService } from './shops.service';

@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMyShop(@CurrentUser() user: AuthenticatedUser) {
    return this.shopsService.getMyShop(user);
  }

  @Patch('me/profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.Seller)
  updateMyShopProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateShopProfileDto,
  ) {
    return this.shopsService.updateMyShopProfile(user, dto);
  }

  @Get('me/operation')
  @UseGuards(JwtAuthGuard)
  getMyShopOperation(@CurrentUser() user: AuthenticatedUser) {
    return this.shopsService.getMyShopOperation(user);
  }

  @Patch('me/operation/pause-scheduled')
  @UseGuards(JwtAuthGuard)
  scheduleMyShopPause(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ScheduleShopPauseDto,
  ) {
    return this.shopsService.scheduleMyShopPause(user, dto);
  }

  @Patch('me/operation/pause-indefinitely')
  @UseGuards(JwtAuthGuard)
  pauseMyShopIndefinitely(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PauseShopIndefinitelyDto,
  ) {
    return this.shopsService.pauseMyShopIndefinitely(user, dto);
  }

  @Patch('me/operation/resume')
  @UseGuards(JwtAuthGuard)
  resumeMyShop(@CurrentUser() user: AuthenticatedUser) {
    return this.shopsService.resumeMyShop(user);
  }

  @Get(':slug')
  getPublicShop(
    @Param('slug') slug: string,
    @Query() query: ShopCatalogQueryDto,
  ) {
    return this.shopsService.getPublicShopCatalog(slug, query);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  createShop(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateShopDto,
  ) {
    return this.shopsService.createShop(user, dto);
  }
}

import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types';
import { CreateSaleCampaignDto } from './dto/create-sale-campaign.dto';
import { SaleCampaignsService } from './sale-campaigns.service';

@Controller('seller/sale-campaigns')
@UseGuards(JwtAuthGuard)
export class SellerSaleCampaignsController {
  constructor(private readonly service: SaleCampaignsService) {}
  @Get() list(@CurrentUser() user: AuthenticatedUser) { return this.service.list(user); }
  @Post() create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSaleCampaignDto) { return this.service.create(user, dto); }
  @Patch(':id/cancel') cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.cancel(user, id); }
}

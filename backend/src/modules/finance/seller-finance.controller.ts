import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AppRole } from '../auth/app-role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types';
import { FinanceIdParamDto } from './dto/finance-id-param.dto';
import {
  CreatePayoutDto,
  SavePayoutAccountDto,
  SellerPayoutQueryDto,
} from './dto/payout.dto';
import { SellerLedgerQueryDto } from './dto/seller-ledger-query.dto';
import { PayoutBankDirectoryService } from './payout-bank-directory.service';
import { PayoutService } from './payout.service';
import { SellerLedgerService } from './seller-ledger.service';

@Controller('seller/finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.Seller)
export class SellerFinanceController {
  constructor(
    private readonly sellerLedgerService: SellerLedgerService,
    private readonly payoutService: PayoutService,
    private readonly payoutBankDirectoryService: PayoutBankDirectoryService,
  ) {}

  @Get('summary')
  getSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.sellerLedgerService.getSellerSummary(user);
  }

  @Get('ledger')
  listLedger(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SellerLedgerQueryDto,
  ) {
    return this.sellerLedgerService.listSellerLedger(user, query);
  }

  @Get('payout-banks')
  listPayoutBanks() {
    return this.payoutBankDirectoryService.list();
  }

  @Get('payout-account')
  getPayoutAccount(@CurrentUser() user: AuthenticatedUser) {
    return this.payoutService.getSellerAccount(user);
  }

  @Put('payout-account')
  savePayoutAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SavePayoutAccountDto,
  ) {
    return this.payoutService.saveSellerAccount(user, dto);
  }

  @Get('payouts')
  listPayouts(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SellerPayoutQueryDto,
  ) {
    return this.payoutService.listSellerPayouts(user, query);
  }

  @Post('payouts')
  createPayout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePayoutDto,
  ) {
    return this.payoutService.createSellerPayout(user, dto);
  }

  @Patch('payouts/:id/cancel')
  cancelPayout(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: FinanceIdParamDto,
  ) {
    return this.payoutService.cancelSellerPayout(user, params.id);
  }
}

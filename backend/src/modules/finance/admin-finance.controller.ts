import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
  AdminBankTransactionQueryDto,
  AdminPayoutQueryDto,
  FailPayoutDto,
  ManualMatchDto,
  ProcessPayoutDto,
  RejectPayoutDto,
} from './dto/payout.dto';
import { AdminSellerLedgerQueryDto } from './dto/seller-ledger-query.dto';
import { PayoutService } from './payout.service';
import { SellerLedgerService } from './seller-ledger.service';

@Controller('admin/finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.Admin)
export class AdminFinanceController {
  constructor(
    private readonly sellerLedgerService: SellerLedgerService,
    private readonly payoutService: PayoutService,
  ) {}

  @Get('ledger')
  listLedger(@Query() query: AdminSellerLedgerQueryDto) {
    return this.sellerLedgerService.listAdminLedger(query);
  }

  @Get('payouts')
  listPayouts(@Query() query: AdminPayoutQueryDto) {
    return this.payoutService.listAdminPayouts(query);
  }

  @Patch('payouts/:id/approve')
  approvePayout(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: FinanceIdParamDto,
  ) {
    return this.payoutService.approvePayout(user, params.id);
  }

  @Patch('payouts/:id/reject')
  rejectPayout(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: FinanceIdParamDto,
    @Body() dto: RejectPayoutDto,
  ) {
    return this.payoutService.rejectPayout(user, params.id, dto);
  }

  @Patch('payouts/:id/process')
  processPayout(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: FinanceIdParamDto,
    @Body() dto: ProcessPayoutDto,
  ) {
    return this.payoutService.processPayout(user, params.id, dto);
  }

  @Patch('payouts/:id/fail')
  failPayout(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: FinanceIdParamDto,
    @Body() dto: FailPayoutDto,
  ) {
    return this.payoutService.failPayout(user, params.id, dto);
  }

  @Get('bank-transactions')
  listBankTransactions(@Query() query: AdminBankTransactionQueryDto) {
    return this.payoutService.listBankTransactions(query);
  }

  @Get('bank-transactions/:id')
  getBankTransaction(@Param() params: FinanceIdParamDto) {
    return this.payoutService.getBankTransaction(params.id);
  }

  @Patch('bank-transactions/:id/match')
  manuallyMatch(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: FinanceIdParamDto,
    @Body() dto: ManualMatchDto,
  ) {
    return this.payoutService.manuallyMatchBankTransaction(
      user,
      params.id,
      dto,
    );
  }
}

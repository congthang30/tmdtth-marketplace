import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types';
import { PaymentsService } from './payments.service';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('methods')
  listActiveMethods() {
    return this.paymentsService.listActiveMethods();
  }

  @Post(':id/fake-success')
  markFakeSuccess(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') paymentId: string,
  ) {
    return this.paymentsService.markFakeSuccess(user, paymentId);
  }
}

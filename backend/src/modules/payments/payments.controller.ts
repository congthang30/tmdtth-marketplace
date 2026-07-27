import {
  Controller,
  Get,
  Ip,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types';
import { PaymentsService } from './payments.service';
import { VnpayParams } from './providers/vnpay.provider';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('methods')
  @UseGuards(JwtAuthGuard)
  listActiveMethods() {
    return this.paymentsService.listActiveMethods();
  }

  @Post(':id/vnpay/payment-url')
  @UseGuards(JwtAuthGuard)
  createVnpayPaymentUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') paymentId: string,
    @Ip() clientIp: string,
  ) {
    return this.paymentsService.createVnpayPaymentUrl(
      user,
      paymentId,
      clientIp,
    );
  }

  @Get('vnpay/return')
  handleVnpayReturn(@Query() query: VnpayParams) {
    return this.paymentsService.handleVnpayCallback(query);
  }

  @Get('vnpay/ipn')
  async handleVnpayIpn(@Query() query: VnpayParams) {
    const result = await this.paymentsService.handleVnpayCallback(query);
    return result.paymentId
      ? { RspCode: '00', Message: 'Confirm Success' }
      : { RspCode: '01', Message: 'Order not found' };
  }
}

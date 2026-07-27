import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/types';
import { CheckoutPaymentMethodSummary } from '../orders/types';
import { VnpayParams, VnpayProvider } from './providers/vnpay.provider';

const VNPAY_METHOD_CODE = 'VNPAY';
const PAYMENT_STATUS_PENDING = 'Pending';
const PAYMENT_STATUS_PAID = 'Paid';

type VnpayCallbackResult = {
  success: boolean;
  paymentId: string | null;
  orderId: string | null;
  paymentStatus: string;
  message: string;
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vnpay: VnpayProvider = new VnpayProvider(),
  ) {}

  async listActiveMethods(): Promise<CheckoutPaymentMethodSummary[]> {
    const methods = await this.prisma.paymentMethod.findMany({
      where: { isActive: true },
      orderBy: [{ id: 'asc' }],
    });
    return methods.map((method) => ({
      id: method.id.toString(),
      idString: method.id.toString(),
      methodCode: method.methodCode,
      methodName: method.methodName,
      isOnline: method.isOnline,
    }));
  }

  async createVnpayPaymentUrl(
    user: AuthenticatedUser,
    paymentId: string,
    clientIp: string,
  ) {
    const id = this.parsePaymentId(paymentId);
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { paymentMethod: true, order: { select: { userId: true } } },
    });
    if (!payment) this.throwNotFound();
    if (payment.order.userId !== user.id) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Bạn không có quyền thanh toán đơn hàng này.' });
    }
    if (payment.paymentMethod.methodCode !== VNPAY_METHOD_CODE) {
      throw new BadRequestException({ code: 'PAYMENT_METHOD_NOT_VNPAY', message: 'Phương thức thanh toán không phải VNPay.' });
    }
    if (payment.paymentStatus !== PAYMENT_STATUS_PENDING) {
      throw new BadRequestException({ code: 'PAYMENT_NOT_PENDING', message: 'Giao dịch này không còn chờ thanh toán.' });
    }

    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + this.vnpay.getPaymentTtlMinutes() * 60_000);
    const transactionRef = `${payment.paymentCode}-${createdAt.getTime()}`;
    const paymentUrl = this.vnpay.createPaymentUrl({
      amount: payment.amount.toFixed(0), clientIp, transactionRef,
      orderInfo: `Thanh toan ${payment.paymentCode}`, createdAt, expiresAt,
    });
    await this.prisma.$transaction([
      this.prisma.payment.update({ where: { id }, data: { expiredAt: expiresAt, updatedAt: createdAt } }),
      this.prisma.paymentTransaction.create({ data: {
        paymentId: id, transactionCode: transactionRef, transactionType: 'Payment',
        transactionStatus: PAYMENT_STATUS_PENDING, amount: payment.amount,
      } }),
    ]);
    return { paymentUrl, expiresAt };
  }

  async handleVnpayCallback(params: VnpayParams): Promise<VnpayCallbackResult> {
    if (!this.vnpay.verify(params)) {
      throw new BadRequestException({ code: 'VNPAY_INVALID_SIGNATURE', message: 'Chữ ký VNPay không hợp lệ.' });
    }
    const transactionRef = params.vnp_TxnRef;
    const transaction = await this.prisma.paymentTransaction.findFirst({
      where: { transactionCode: transactionRef },
      include: { payment: true },
    });
    if (!transaction) {
      return { success: false, paymentId: null, orderId: null, paymentStatus: 'NotFound', message: 'Không tìm thấy giao dịch.' };
    }
    const expectedAmount = transaction.amount.mul(100).toFixed(0);
    if (params.vnp_Amount !== expectedAmount) {
      throw new BadRequestException({ code: 'VNPAY_AMOUNT_MISMATCH', message: 'Số tiền giao dịch không khớp.' });
    }
    const isSuccess = params.vnp_ResponseCode === '00' && params.vnp_TransactionStatus === '00';
    if (transaction.transactionStatus !== PAYMENT_STATUS_PENDING) {
      return this.callbackResult(transaction.payment, transaction.transactionStatus === 'Success');
    }

    const now = new Date();
    const nextTransactionStatus = isSuccess ? 'Success' : 'Failed';
    const nextPaymentStatus = isSuccess ? PAYMENT_STATUS_PAID : 'Failed';
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.paymentTransaction.updateMany({
        where: { id: transaction.id, transactionStatus: PAYMENT_STATUS_PENDING },
        data: {
          transactionStatus: nextTransactionStatus,
          providerResponseCode: params.vnp_ResponseCode,
          providerResponseMessage: isSuccess ? 'Thanh toán thành công' : 'Thanh toán không thành công',
          rawResponse: JSON.stringify(this.sanitizeParams(params)),
        },
      });
      if (claimed.count === 0) return;
      await tx.payment.update({ where: { id: transaction.paymentId }, data: {
        paymentStatus: nextPaymentStatus,
        providerTransactionCode: params.vnp_TransactionNo || null,
        paidAt: isSuccess ? now : null,
        updatedAt: now,
      } });
      await tx.order.update({ where: { id: transaction.payment.orderId }, data: { paymentStatus: nextPaymentStatus, updatedAt: now } });
      await tx.paymentStatusHistory.create({ data: {
        paymentId: transaction.paymentId, fromStatus: transaction.payment.paymentStatus,
        toStatus: nextPaymentStatus, reason: `VNPay response ${params.vnp_ResponseCode}`,
      } });
    });
    return { success: isSuccess, paymentId: transaction.paymentId.toString(), orderId: transaction.payment.orderId.toString(), paymentStatus: nextPaymentStatus, message: isSuccess ? 'Thanh toán thành công.' : 'Thanh toán không thành công.' };
  }

  async markFakeSuccess(user: AuthenticatedUser, paymentId: string) {
    const id = this.parsePaymentId(paymentId);
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { id },
        include: { paymentMethod: true, order: { select: { id: true, userId: true } } },
      });
      if (!payment) this.throwNotFound();
      if (payment.order.userId !== user.id) {
        throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Bạn không có quyền thanh toán đơn hàng này.' });
      }
      if (payment.paymentMethod.methodCode !== 'FAKE_ONLINE') {
        throw new BadRequestException({ code: 'PAYMENT_METHOD_NOT_FAKE_ONLINE', message: 'Only fake online payments can be marked successful' });
      }
      if (payment.paymentStatus !== PAYMENT_STATUS_PENDING) {
        throw new BadRequestException({ code: 'PAYMENT_NOT_PENDING', message: 'Only pending payments can be marked successful' });
      }
      const now = new Date();
      const updated = await tx.payment.update({
        where: { id }, data: { paymentStatus: PAYMENT_STATUS_PAID, paidAt: now, updatedAt: now, providerTransactionCode: `FAKE-${payment.paymentCode}` },
        include: { paymentMethod: true, order: { select: { id: true, userId: true } } },
      });
      await tx.order.update({ where: { id: payment.orderId }, data: { paymentStatus: PAYMENT_STATUS_PAID, updatedAt: now } });
      await tx.paymentStatusHistory.create({ data: { paymentId: id, fromStatus: payment.paymentStatus, toStatus: PAYMENT_STATUS_PAID, reason: 'Fake online payment marked successful', createdAt: now } });
      return {
        id: updated.id.toString(), idString: updated.id.toString(), paymentCode: updated.paymentCode,
        paymentMethod: { id: updated.paymentMethod.id.toString(), idString: updated.paymentMethod.id.toString(), methodCode: updated.paymentMethod.methodCode, methodName: updated.paymentMethod.methodName, isOnline: updated.paymentMethod.isOnline },
        providerName: updated.providerName, amount: updated.amount.toString(), paymentStatus: updated.paymentStatus,
        paidAt: updated.paidAt, expiredAt: updated.expiredAt, createdAt: updated.createdAt, updatedAt: updated.updatedAt,
      };
    });
  }

  private callbackResult(payment: Prisma.PaymentGetPayload<object>, success: boolean): VnpayCallbackResult {
    return { success, paymentId: payment.id.toString(), orderId: payment.orderId.toString(), paymentStatus: payment.paymentStatus, message: success ? 'Thanh toán thành công.' : 'Giao dịch đã được xử lý.' };
  }

  private sanitizeParams(params: VnpayParams) {
    return Object.fromEntries(Object.entries(params).filter(([key]) => key !== 'vnp_SecureHash'));
  }

  private throwNotFound(): never {
    throw new NotFoundException({ code: 'PAYMENT_NOT_FOUND', message: 'Không tìm thấy giao dịch thanh toán.' });
  }

  private parsePaymentId(value: string): bigint {
    if (!/^\d+$/.test(value)) throw new BadRequestException({ code: 'INVALID_PAYMENT_ID', message: 'Mã giao dịch không hợp lệ.' });
    return BigInt(value);
  }
}

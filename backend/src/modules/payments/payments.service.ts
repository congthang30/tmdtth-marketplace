import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/types';
import { CheckoutPaymentMethodSummary, PaymentResponse } from '../orders/types';

const PAYMENT_STATUS_PENDING = 'Pending';
const PAYMENT_STATUS_PAID = 'Paid';
const ORDER_PAYMENT_STATUS_PAID = 'Paid';
const FAKE_PAYMENT_ALLOWED_METHODS = new Set(['FAKE_ONLINE']);

type PaymentWithMethodAndOrder = Prisma.PaymentGetPayload<{
  include: {
    paymentMethod: true;
    order: {
      select: {
        id: true;
        userId: true;
      };
    };
  };
}>;

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async markFakeSuccess(
    user: AuthenticatedUser,
    paymentId: string,
  ): Promise<PaymentResponse> {
    const id = this.parsePaymentId(paymentId);

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { id },
        include: {
          paymentMethod: true,
          order: {
            select: {
              id: true,
              userId: true,
            },
          },
        },
      });

      if (!payment) {
        throw new NotFoundException({
          code: 'PAYMENT_NOT_FOUND',
          message: 'Payment not found',
          details: [{ field: 'paymentId' }],
        });
      }

      if (payment.order.userId !== user.id) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'You do not have permission to update this payment',
        });
      }

      if (!FAKE_PAYMENT_ALLOWED_METHODS.has(payment.paymentMethod.methodCode)) {
        throw new BadRequestException({
          code: 'PAYMENT_METHOD_NOT_FAKE_ONLINE',
          message: 'Only fake online payments can be marked successful',
          details: [{ field: 'paymentId' }],
        });
      }

      if (payment.paymentStatus !== PAYMENT_STATUS_PENDING) {
        throw new BadRequestException({
          code: 'PAYMENT_NOT_PENDING',
          message: 'Only pending payments can be marked successful',
          details: [{ field: 'paymentStatus' }],
        });
      }

      const now = new Date();
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          paymentStatus: PAYMENT_STATUS_PAID,
          paidAt: now,
          updatedAt: now,
          providerTransactionCode: `FAKE-${payment.paymentCode}`,
        },
        include: {
          paymentMethod: true,
          order: {
            select: {
              id: true,
              userId: true,
            },
          },
        },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: ORDER_PAYMENT_STATUS_PAID,
          updatedAt: now,
        },
      });

      await tx.paymentStatusHistory.create({
        data: {
          paymentId: payment.id,
          fromStatus: payment.paymentStatus,
          toStatus: PAYMENT_STATUS_PAID,
          reason: 'Fake online payment marked successful',
          createdAt: now,
        },
      });

      return this.toPaymentResponse(updatedPayment);
    });
  }

  private toPaymentResponse(
    payment: PaymentWithMethodAndOrder,
  ): PaymentResponse {
    return {
      id: payment.id.toString(),
      idString: payment.id.toString(),
      paymentCode: payment.paymentCode,
      paymentMethod: {
        id: payment.paymentMethod.id.toString(),
        idString: payment.paymentMethod.id.toString(),
        methodCode: payment.paymentMethod.methodCode,
        methodName: payment.paymentMethod.methodName,
        isOnline: payment.paymentMethod.isOnline,
      },
      providerName: payment.providerName,
      amount: payment.amount.toString(),
      paymentStatus: payment.paymentStatus,
      paidAt: payment.paidAt,
      expiredAt: payment.expiredAt,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  private parsePaymentId(value: string): bigint {
    if (!/^\d+$/.test(value)) {
      throw new BadRequestException({
        code: 'INVALID_PAYMENT_ID',
        message: 'Payment id is invalid',
        details: [{ field: 'paymentId' }],
      });
    }

    return BigInt(value);
  }
}

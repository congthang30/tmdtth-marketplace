import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { getVnpayConfig } from '../../../config/vnpay.config';

export type VnpayParams = Record<string, string>;

type CreatePaymentUrlInput = {
  amount: string;
  clientIp: string;
  orderInfo: string;
  transactionRef: string;
  createdAt: Date;
  expiresAt: Date;
};

@Injectable()
export class VnpayProvider {
  createPaymentUrl(input: CreatePaymentUrlInput): string {
    const config = this.requireConfig();
    const amount = this.toProviderAmount(input.amount);
    const params: VnpayParams = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: config.tmnCode,
      vnp_Amount: amount,
      vnp_CurrCode: 'VND',
      vnp_TxnRef: input.transactionRef,
      vnp_OrderInfo: input.orderInfo,
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: config.returnUrl,
      vnp_IpAddr: input.clientIp,
      vnp_CreateDate: this.formatDate(input.createdAt),
      vnp_ExpireDate: this.formatDate(input.expiresAt),
    };
    const query = this.toQuery(params);
    const signature = this.sign(query, config.hashSecret);
    return `${config.paymentUrl}?${query}&vnp_SecureHash=${signature}`;
  }

  verify(params: VnpayParams): boolean {
    const config = this.requireConfig();
    const received = params.vnp_SecureHash;
    if (!received || !/^[a-f\d]{128}$/i.test(received)) return false;
    const unsigned = Object.fromEntries(
      Object.entries(params).filter(
        ([key]) => key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType',
      ),
    );
    const expected = this.sign(this.toQuery(unsigned), config.hashSecret);
    return timingSafeEqual(
      Buffer.from(received, 'hex'),
      Buffer.from(expected, 'hex'),
    );
  }

  getPaymentTtlMinutes(): number {
    return getVnpayConfig().paymentTtlMinutes;
  }

  private requireConfig() {
    const config = getVnpayConfig();
    if (
      !config.isConfigured ||
      !config.tmnCode ||
      !config.hashSecret ||
      !config.returnUrl
    ) {
      throw new ServiceUnavailableException({
        code: 'VNPAY_NOT_CONFIGURED',
        message: 'VNPay chưa được cấu hình. Vui lòng thử lại sau.',
      });
    }
    return {
      ...config,
      tmnCode: config.tmnCode,
      hashSecret: config.hashSecret,
      returnUrl: config.returnUrl,
    };
  }

  private toProviderAmount(amount: string): string {
    const value = Number(amount);
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new Error('VNPay amount must be a positive VND integer');
    }
    return String(value * 100);
  }

  private toQuery(params: VnpayParams): string {
    return Object.entries(params)
      .filter(([, value]) => value !== '')
      .sort(([left], [right]) => left.localeCompare(right))
      .map(
        ([key, value]) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(value).replace(/%20/g, '+')}`,
      )
      .join('&');
  }

  private sign(value: string, secret: string): string {
    return createHmac('sha512', secret).update(value, 'utf8').digest('hex');
  }

  private formatDate(value: Date): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(value);
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((item) => item.type === type)?.value ?? '';
    return `${part('year')}${part('month')}${part('day')}${part('hour')}${part('minute')}${part('second')}`;
  }
}

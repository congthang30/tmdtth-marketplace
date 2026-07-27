import { Injectable, Logger } from '@nestjs/common';
import {
  getCarrierRetryCount,
  getCarrierTimeoutMs,
  getGhnConfig,
} from '../../../config/carrier.config';
import {
  CarrierApiError,
  CarrierClient,
  CarrierNotConfiguredError,
  CarrierOrderInput,
  CarrierOrderResult,
  CarrierQuoteInput,
  CarrierQuoteResult,
  CarrierTrackingResult,
  CarrierTrackingStatus,
} from './carrier.types';
import { GhnAddressResolver } from './ghn-address.resolver';

type GhnFeeResponse = {
  code: number;
  message: string;
  data?: { total: number };
};

type GhnCreateOrderResponse = {
  code: number;
  message: string;
  data?: {
    order_code: string;
    expected_delivery_time?: string;
    total_fee?: number;
  };
};

type GhnOrderDetailResponse = {
  code: number;
  message: string;
  data?: {
    status: string;
    updated_date?: string;
  };
};

const GHN_DEFAULT_ITEM_DIMENSIONS_CM = 20;

/**
 * Maps GHN's granular order statuses onto our internal shipment status
 * machine. GHN documents ~20 statuses; we collapse them into the 6 states
 * the rest of the app (Shipment.shipmentStatus) already understands.
 * Reference: https://api.ghn.vn (order status dictionary).
 */
const GHN_STATUS_MAP: Record<string, CarrierTrackingStatus> = {
  ready_to_pick: 'Pending',
  picking: 'Pending',
  money_collect_picking: 'Pending',
  picked: 'PickedUp',
  storing: 'InTransit',
  transporting: 'InTransit',
  sorting: 'InTransit',
  delivering: 'InTransit',
  money_collect_delivering: 'InTransit',
  delivered: 'Delivered',
  delivery_fail: 'Failed',
  waiting_to_return: 'Failed',
  return: 'Failed',
  returned: 'Failed',
  cancel: 'Cancelled',
  exception: 'Failed',
  damage: 'Failed',
  lost: 'Failed',
};

@Injectable()
export class GhnClient implements CarrierClient {
  readonly provider = 'GHN' as const;
  private readonly logger = new Logger(GhnClient.name);

  constructor(private readonly addressResolver: GhnAddressResolver) {}

  isConfigured(): boolean {
    return getGhnConfig().isConfigured;
  }

  private async request<T>(
    path: string,
    method: 'GET' | 'POST',
    body?: unknown,
  ): Promise<T> {
    const config = getGhnConfig();

    if (!config.isConfigured) {
      throw new CarrierNotConfiguredError('GHN');
    }

    const retries = getCarrierRetryCount();
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        getCarrierTimeoutMs(),
      );

      try {
        const response = await fetch(`${config.baseUrl}${path}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Token: config.token ?? '',
            ShopId: config.shopId ?? '',
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        const json = (await response.json()) as {
          code?: number;
          message?: string;
        };

        if (!response.ok || json.code !== 200) {
          throw new CarrierApiError(
            'GHN',
            `GHN báo lỗi: ${json.message ?? response.statusText ?? 'Không xác định'}`,
            json,
          );
        }

        return json as T;
      } catch (error) {
        lastError = error;
        if (error instanceof CarrierApiError || attempt === retries) {
          break;
        }
        this.logger.warn(
          `GHN request to ${path} failed (attempt ${attempt + 1}), retrying...`,
        );
      } finally {
        clearTimeout(timeout);
      }
    }

    if (lastError instanceof CarrierApiError) {
      throw lastError;
    }

    throw new CarrierApiError(
      'GHN',
      'Không thể kết nối tới dịch vụ vận chuyển GHN. Vui lòng thử lại sau.',
      lastError,
    );
  }

  async healthCheck(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }
    try {
      await this.request('/master-data/province', 'POST', {});
      return true;
    } catch {
      return false;
    }
  }

  async getQuote(input: CarrierQuoteInput): Promise<CarrierQuoteResult> {
    const from = await this.addressResolver.resolve(
      input.from.provinceName,
      input.from.wardName,
    );
    const to = await this.addressResolver.resolve(
      input.to.provinceName,
      input.to.wardName,
    );

    if (!from || !to) {
      throw new CarrierApiError(
        'GHN',
        'Không thể xác định địa chỉ lấy hàng hoặc giao hàng theo dữ liệu GHN. Vui lòng kiểm tra lại địa chỉ.',
      );
    }

    const response = await this.request<GhnFeeResponse>(
      '/v2/shipping-order/fee',
      'POST',
      {
        service_type_id: Number(input.carrierServiceCode),
        from_district_id: from.districtId,
        from_ward_code: from.wardCode,
        to_district_id: to.districtId,
        to_ward_code: to.wardCode,
        weight: Math.max(input.weightGram, 1),
        length: GHN_DEFAULT_ITEM_DIMENSIONS_CM,
        width: GHN_DEFAULT_ITEM_DIMENSIONS_CM,
        height: GHN_DEFAULT_ITEM_DIMENSIONS_CM,
        insurance_value: 0,
      },
    );

    return {
      feeAmount: response.data?.total ?? 0,
      estimatedMinDays: 2,
      estimatedMaxDays: 5,
      raw: response,
    };
  }

  async createOrder(input: CarrierOrderInput): Promise<CarrierOrderResult> {
    const from = await this.addressResolver.resolve(
      input.from.provinceName,
      input.from.wardName,
    );
    const to = await this.addressResolver.resolve(
      input.to.provinceName,
      input.to.wardName,
    );

    if (!from || !to) {
      throw new CarrierApiError(
        'GHN',
        'Không thể xác định địa chỉ lấy hàng hoặc giao hàng theo dữ liệu GHN. Vui lòng kiểm tra lại địa chỉ.',
      );
    }

    const response = await this.request<GhnCreateOrderResponse>(
      '/v2/shipping-order/create',
      'POST',
      {
        payment_type_id: 1,
        service_type_id: Number(input.carrierServiceCode),
        required_note: 'KHONGCHOXEMHANG',
        client_order_code: input.clientOrderCode,
        from_district_id: from.districtId,
        from_ward_code: from.wardCode,
        from_address: input.from.streetAddress,
        from_name: input.from.name ?? undefined,
        from_phone: input.from.phone ?? undefined,
        to_name: input.recipientName,
        to_phone: input.recipientPhone,
        to_address: input.to.streetAddress,
        to_district_id: to.districtId,
        to_ward_code: to.wardCode,
        weight: Math.max(input.weightGram, 1),
        length: GHN_DEFAULT_ITEM_DIMENSIONS_CM,
        width: GHN_DEFAULT_ITEM_DIMENSIONS_CM,
        height: GHN_DEFAULT_ITEM_DIMENSIONS_CM,
        cod_amount: Math.round(input.codAmount),
        content: input.note ?? undefined,
      },
    );

    if (!response.data?.order_code) {
      throw new CarrierApiError(
        'GHN',
        'GHN không trả về mã vận đơn hợp lệ.',
        response,
      );
    }

    return {
      carrierOrderCode: response.data.order_code,
      feeAmount: response.data.total_fee ?? 0,
      expectedDeliveryAt: response.data.expected_delivery_time
        ? new Date(response.data.expected_delivery_time)
        : null,
      raw: response,
    };
  }

  async getOrderStatus(
    carrierOrderCode: string,
  ): Promise<CarrierTrackingResult> {
    const response = await this.request<GhnOrderDetailResponse>(
      '/v2/shipping-order/detail',
      'POST',
      { order_code: carrierOrderCode },
    );

    const rawStatus = response.data?.status ?? '';
    const status = GHN_STATUS_MAP[rawStatus] ?? 'InTransit';

    return {
      status,
      carrierStatusRaw: rawStatus,
      deliveredAt:
        status === 'Delivered' && response.data?.updated_date
          ? new Date(response.data.updated_date)
          : null,
    };
  }
}

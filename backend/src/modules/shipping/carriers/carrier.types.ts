/**
 * Common types shared by all carrier integrations (GHN, GHTK). Every real
 * carrier client implements CarrierClient so the shipping service can treat
 * GHN and GHTK uniformly.
 */

export type CarrierProvider = 'GHN';

export type CarrierAddressInput = {
  provinceName: string;
  wardName: string;
  streetAddress: string;
};

export type CarrierQuoteInput = {
  carrierServiceCode: string;
  from: CarrierAddressInput;
  to: CarrierAddressInput;
  weightGram: number;
};

export type CarrierQuoteResult = {
  /** Fee quoted by the carrier, in VND, as an integer. */
  feeAmount: number;
  estimatedMinDays: number;
  estimatedMaxDays: number;
  /** Raw response payload from the carrier, kept for audit purposes. */
  raw: unknown;
};

export type CarrierOrderInput = {
  carrierServiceCode: string;
  clientOrderCode: string;
  from: CarrierAddressInput & { name?: string; phone?: string };
  to: CarrierAddressInput;
  recipientName: string;
  recipientPhone: string;
  weightGram: number;
  codAmount: number;
  note?: string | null;
};

export type CarrierOrderResult = {
  carrierOrderCode: string;
  feeAmount: number;
  expectedDeliveryAt: Date | null;
  raw: unknown;
};

export type CarrierTrackingStatus =
  | 'Pending'
  | 'PickedUp'
  | 'InTransit'
  | 'Delivered'
  | 'Failed'
  | 'Cancelled';

export type CarrierTrackingResult = {
  status: CarrierTrackingStatus;
  carrierStatusRaw: string;
  deliveredAt: Date | null;
};

export interface CarrierClient {
  readonly provider: CarrierProvider;
  isConfigured(): boolean;
  healthCheck(): Promise<boolean>;
  getQuote(input: CarrierQuoteInput): Promise<CarrierQuoteResult>;
  createOrder(input: CarrierOrderInput): Promise<CarrierOrderResult>;
  getOrderStatus(carrierOrderCode: string): Promise<CarrierTrackingResult>;
}

/**
 * Thrown when a carrier API call fails (network error, non-2xx response, or
 * carrier-reported business error). Carries a Vietnamese, user-facing
 * message plus the raw carrier error for logging/debugging.
 */
export class CarrierApiError extends Error {
  constructor(
    public readonly provider: CarrierProvider,
    message: string,
    public readonly raw?: unknown,
  ) {
    super(message);
    this.name = 'CarrierApiError';
  }
}

export class CarrierNotConfiguredError extends Error {
  constructor(public readonly provider: CarrierProvider) {
    super(
      `${provider} chưa được cấu hình. Vui lòng thiết lập biến môi trường ${provider}_TOKEN trước khi sử dụng.`,
    );
    this.name = 'CarrierNotConfiguredError';
  }
}

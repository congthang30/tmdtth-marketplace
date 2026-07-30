export type ShippingCompanyResponse = {
  id: string;
  idString: string;
  provider: string;
  code: string;
  companyName: string;
  slug: string;
  email: string | null;
  phoneNumber: string | null;
  taxCode: string | null;
  addressText: string | null;
  companyStatus: string;
  isConfigured: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date | null;
  deletedAt: Date | null;
};

export type ShippingServiceResponse = {
  id: string;
  idString: string;
  shippingCompanyId: string;
  shippingCompanyIdString: string;
  serviceCode: string;
  serviceName: string;
  carrierServiceCode: string;
  estimatedMinDays: number;
  estimatedMaxDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date | null;
};

export type ShippingQuoteResponse = {
  id: string;
  idString: string;
  shop: {
    id: string;
    idString: string;
    shopName: string;
    slug: string;
  };
  shippingCompany: {
    id: string;
    idString: string;
    companyName: string;
    slug: string;
  };
  shippingService: {
    id: string;
    idString: string;
    serviceCode: string;
    serviceName: string;
  };
  destinationProvince: string;
  destinationWard: string;
  totalWeightGram: number;
  quotedFee: string;
  estimatedMinDays: number;
  estimatedMaxDays: number;
  expiresAt: Date;
  createdAt: Date;
};

export type ShipmentItemResponse = {
  id: string;
  idString: string;
  orderItemId: string;
  orderItemIdString: string;
  quantity: number;
  createdAt: Date;
};

export type ShipmentResponse = {
  id: string;
  idString: string;
  shopOrderId: string;
  shopOrderIdString: string;
  shipmentCode: string;
  trackingNumber: string | null;
  carrierOrderCode: string | null;
  carrierStatus: string | null;
  shipmentStatus: string;
  shippingFee: string;
  codAmount: string;
  handoverMethod: string;
  pickupStation: {
    id: number;
    name: string;
    address: string;
  } | null;
  pickupAddress: string | null;
  deliveryAddress: string;
  recipientName: string;
  recipientPhone: string;
  expectedDeliveryAt: Date | null;
  pickedUpAt: Date | null;
  deliveredAt: Date | null;
  shippingCompany: {
    id: string;
    idString: string;
    companyName: string;
    slug: string;
    provider: string;
  };
  shippingService: {
    id: string;
    idString: string;
    serviceCode: string;
    serviceName: string;
  };
  items: ShipmentItemResponse[];
  createdAt: Date;
  updatedAt: Date | null;
};

export type HandoverStationResponse = {
  id: number;
  name: string;
  address: string;
  wardName: string | null;
  districtName: string | null;
  provinceName: string | null;
};

export type ShipmentLabelResponse = {
  printUrl: string;
  expiresAt: Date;
};

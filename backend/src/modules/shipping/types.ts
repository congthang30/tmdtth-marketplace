export type ShippingCompanyResponse = {
  id: string;
  idString: string;
  ownerUserId: string;
  ownerUserIdString: string;
  code: string;
  companyName: string;
  slug: string;
  email: string | null;
  phoneNumber: string | null;
  taxCode: string | null;
  addressText: string | null;
  companyStatus: string;
  approvedByUserId: string | null;
  approvedByUserIdString: string | null;
  approvedAt: Date | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date | null;
  deletedAt: Date | null;
};

export type DeleteShippingCompanyResponse = {
  id: string;
  deleted: true;
};

export type ShippingServiceResponse = {
  id: string;
  idString: string;
  shippingCompanyId: string;
  shippingCompanyIdString: string;
  serviceCode: string;
  serviceName: string;
  baseFee: string;
  feePerKg: string;
  estimatedMinDays: number;
  estimatedMaxDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date | null;
};

export type DeactivateShippingServiceResponse = {
  id: string;
  deactivated: true;
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
  destinationDistrict: string | null;
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
  shipmentStatus: string;
  shippingFee: string;
  codAmount: string;
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

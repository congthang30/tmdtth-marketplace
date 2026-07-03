export type AddressResponse = {
  id: string;
  idString: string;
  receiverName: string;
  phoneNumber: string;
  province: string;
  district: string;
  ward: string;
  streetAddress: string;
  fullAddress: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date | null;
};

export type DeleteAddressResponse = {
  id: string;
  deleted: true;
};

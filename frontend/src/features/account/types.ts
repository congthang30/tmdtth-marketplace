import type { ApiMeta } from '@/types/api';
import type { AuthUser } from '@/types/domain';

export type UserMe = AuthUser & {
  emailConfirmed: boolean;
  phoneConfirmed: boolean;
  profile: {
    fullName: string;
    gender: string | null;
    dateOfBirth: string | null;
    avatarUrl: string | null;
  } | null;
};

export type UpdateMeRequest = {
  fullName?: string;
  avatarUrl?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
};

export type Address = {
  id: string;
  idString: string;
  receiverName: string;
  phoneNumber: string;
  province: string;
  ward: string;
  streetAddress: string;
  fullAddress: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string | null;
};

export type AddressListResponse = {
  items: Address[];
  meta?: ApiMeta;
};

export type AddressRequest = {
  receiverName: string;
  phoneNumber: string;
  province: string;
  ward: string;
  streetAddress: string;
  fullAddress?: string | null;
  isDefault?: boolean;
};

export type DeleteAddressResponse = {
  id: string;
  deleted: true;
};

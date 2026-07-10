export type AppRole = 'Customer' | 'Seller' | 'Admin';

export type AuthUser = {
  id: string;
  idString: string;
  email: string;
  phoneNumber: string | null;
  userStatus: string;
  roles: AppRole[];
  profile: {
    fullName: string;
    gender?: string | null;
    dateOfBirth?: string | null;
    avatarUrl: string | null;
  } | null;
};

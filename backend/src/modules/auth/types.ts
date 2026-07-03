import { AppRole } from './app-role.enum';

export type JwtPayload = {
  sub: string;
  email: string;
};

export type AuthenticatedUser = {
  id: bigint;
  idString: string;
  email: string;
  phoneNumber: string | null;
  userStatus: string;
  roles: AppRole[];
  profile: {
    fullName: string;
    avatarUrl: string | null;
  } | null;
};

export type AuthUserResponse = Omit<AuthenticatedUser, 'id'> & {
  id: string;
};

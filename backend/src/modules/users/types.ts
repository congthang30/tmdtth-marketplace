import { AppRole } from '../auth/app-role.enum';

export type UserMeProfileResponse = {
  fullName: string;
  gender: string | null;
  dateOfBirth: Date | null;
  avatarUrl: string | null;
} | null;

export type UserMeResponse = {
  id: string;
  idString: string;
  email: string;
  phoneNumber: string | null;
  userStatus: string;
  emailConfirmed: boolean;
  phoneConfirmed: boolean;
  roles: AppRole[];
  profile: UserMeProfileResponse;
};

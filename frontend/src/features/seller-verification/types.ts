export type SellerType = 'Individual' | 'Business';
export type BusinessType = 'Company' | 'HouseholdBusiness';
export type IdentityDocumentType = 'CitizenId' | 'LegacyId' | 'Passport';
export type VerificationStatus =
  | 'Draft'
  | 'Submitted'
  | 'UnderReview'
  | 'NeedsRevision'
  | 'Approved'
  | 'Rejected'
  | 'Suspended';
export type PayoutStatus =
  | 'Draft'
  | 'PendingVerification'
  | 'Verified'
  | 'Rejected'
  | 'Suspended';
export type SellerDocumentType =
  | 'IdentityFront'
  | 'IdentityBack'
  | 'Passport'
  | 'BusinessRegistration'
  | 'LegalRepresentativeIdentity'
  | 'FaceVerification'
  | 'BankAccountProof';
export type DocumentStatus = 'Pending' | 'Accepted' | 'Rejected';

export type SellerVerificationDocument = {
  id: string;
  documentType: SellerDocumentType;
  mimeType: string;
  originalFileName: string;
  bytes: number;
  documentStatus: DocumentStatus;
  createdAt: string;
  previewUrl?: string;
};

export type SellerVerificationReview = {
  id: string;
  reviewStatus: string;
  fromStatus: VerificationStatus | null;
  toStatus: VerificationStatus;
  reason: string | null;
  createdAt: string;
};

export type SellerVerificationProfile = {
  id: string;
  sellerType: SellerType;
  businessType: BusinessType | null;
  legalName: string;
  identityDocumentType: IdentityDocumentType | null;
  identityNumberMasked: string | null;
  identityIssuedAt: string | null;
  identityIssuedBy: string | null;
  identityExpiresAt: string | null;
  taxCodeMasked: string;
  businessRegistrationNumberMasked: string | null;
  businessRegistrationIssuedAt: string | null;
  businessRegistrationIssuedBy: string | null;
  legalRepresentativeName: string | null;
  registeredAddress: string | null;
  dateOfBirth: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactEmailVerifiedAt: string | null;
  contactPhone: string | null;
  useAccountPhone: boolean;
  faceVerified: boolean;
  verificationStatus: VerificationStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  documents: SellerVerificationDocument[];
  reviews: SellerVerificationReview[];
};

export type SellerPayoutAccount = {
  id: string;
  bankCode: string;
  bankName: string;
  accountNumberMasked: string;
  accountHolderName: string;
  payoutStatus: PayoutStatus;
};

export type SellerVerificationOverview = {
  shop: { id: string; shopName: string; shopStatus: string };
  profile: SellerVerificationProfile | null;
  payoutAccount: SellerPayoutAccount | null;
};

export type SaveSellerVerificationRequest = {
  sellerType: SellerType;
  businessType?: BusinessType;
  legalName: string;
  identityDocumentType?: IdentityDocumentType;
  identityNumber?: string;
  identityIssuedAt?: string;
  identityIssuedBy?: string;
  identityExpiresAt?: string;
  taxCode?: string;
  businessRegistrationNumber?: string;
  businessRegistrationIssuedAt?: string;
  businessRegistrationIssuedBy?: string;
  legalRepresentativeName?: string;
  registeredAddress?: string;
  dateOfBirth?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  useAccountPhone?: boolean;
};

export type SaveSellerPayoutRequest = {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
};

export type SellerDocumentAccess = {
  signedUrl: string;
  expiresIn: number;
};

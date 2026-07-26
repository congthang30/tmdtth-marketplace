CREATE TYPE "SellerType" AS ENUM ('Individual', 'Business');
CREATE TYPE "BusinessType" AS ENUM ('Company', 'HouseholdBusiness');
CREATE TYPE "IdentityDocumentType" AS ENUM ('CitizenId', 'LegacyId', 'Passport');
CREATE TYPE "VerificationStatus" AS ENUM ('Draft', 'Submitted', 'UnderReview', 'NeedsRevision', 'Approved', 'Rejected', 'Suspended');
CREATE TYPE "DocumentStatus" AS ENUM ('Pending', 'Accepted', 'Rejected');
CREATE TYPE "ReviewStatus" AS ENUM ('Pending', 'InProgress', 'NeedsRevision', 'Approved', 'Rejected');
CREATE TYPE "PayoutStatus" AS ENUM ('Draft', 'PendingVerification', 'Verified', 'Rejected', 'Suspended');
CREATE TYPE "SellerDocumentType" AS ENUM ('IdentityFront', 'IdentityBack', 'Passport', 'BusinessRegistration', 'LegalRepresentativeIdentity', 'BankAccountProof');

CREATE TABLE "SellerVerificationProfiles" (
    "SellerVerificationProfileID" BIGSERIAL NOT NULL,
    "ShopID" BIGINT NOT NULL,
    "SellerType" "SellerType" NOT NULL,
    "BusinessType" "BusinessType",
    "LegalName" VARCHAR(200) NOT NULL,
    "IdentityDocumentType" "IdentityDocumentType",
    "IdentityNumberEncrypted" TEXT,
    "IdentityNumberHash" VARCHAR(64),
    "IdentityNumberLast4" VARCHAR(4),
    "IdentityIssuedAt" DATE,
    "IdentityIssuedBy" VARCHAR(200),
    "IdentityExpiresAt" DATE,
    "TaxCodeEncrypted" TEXT NOT NULL,
    "TaxCodeHash" VARCHAR(64) NOT NULL,
    "TaxCodeLast4" VARCHAR(4) NOT NULL,
    "BusinessRegistrationNumberEncrypted" TEXT,
    "BusinessRegistrationNumberHash" VARCHAR(64),
    "BusinessRegistrationNumberLast4" VARCHAR(4),
    "BusinessRegistrationIssuedAt" DATE,
    "BusinessRegistrationIssuedBy" VARCHAR(200),
    "LegalRepresentativeName" VARCHAR(200),
    "RegisteredAddress" VARCHAR(600),
    "VerificationStatus" "VerificationStatus" NOT NULL DEFAULT 'Draft',
    "SubmittedAt" TIMESTAMP(3),
    "ReviewedAt" TIMESTAMP(3),
    "ReviewedByUserID" BIGINT,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3),

    CONSTRAINT "SellerVerificationProfiles_pkey" PRIMARY KEY ("SellerVerificationProfileID")
);

CREATE TABLE "SellerPayoutAccounts" (
    "SellerPayoutAccountID" BIGSERIAL NOT NULL,
    "ShopID" BIGINT NOT NULL,
    "BankCode" VARCHAR(30) NOT NULL,
    "BankNameSnapshot" VARCHAR(200) NOT NULL,
    "AccountNumberEncrypted" TEXT NOT NULL,
    "AccountNumberHash" VARCHAR(64) NOT NULL,
    "AccountNumberLast4" VARCHAR(4) NOT NULL,
    "AccountHolderName" VARCHAR(200) NOT NULL,
    "PayoutStatus" "PayoutStatus" NOT NULL DEFAULT 'Draft',
    "VerifiedAt" TIMESTAMP(3),
    "VerifiedByUserID" BIGINT,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3),

    CONSTRAINT "SellerPayoutAccounts_pkey" PRIMARY KEY ("SellerPayoutAccountID")
);

CREATE TABLE "SellerVerificationDocuments" (
    "SellerVerificationDocumentID" BIGSERIAL NOT NULL,
    "SellerVerificationProfileID" BIGINT NOT NULL,
    "DocumentType" "SellerDocumentType" NOT NULL,
    "StorageProvider" VARCHAR(50) NOT NULL DEFAULT 'Cloudinary',
    "StoragePublicID" VARCHAR(500) NOT NULL,
    "DeliveryType" VARCHAR(50) NOT NULL,
    "ResourceType" VARCHAR(50) NOT NULL,
    "Format" VARCHAR(20) NOT NULL,
    "MimeType" VARCHAR(100) NOT NULL,
    "OriginalFileName" VARCHAR(255) NOT NULL,
    "Bytes" INTEGER NOT NULL,
    "Checksum" VARCHAR(128),
    "DocumentStatus" "DocumentStatus" NOT NULL DEFAULT 'Pending',
    "ExpiresAt" DATE,
    "UploadedByUserID" BIGINT NOT NULL,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3),
    "DeletedAt" TIMESTAMP(3),

    CONSTRAINT "SellerVerificationDocuments_pkey" PRIMARY KEY ("SellerVerificationDocumentID")
);

CREATE TABLE "SellerVerificationReviews" (
    "SellerVerificationReviewID" BIGSERIAL NOT NULL,
    "SellerVerificationProfileID" BIGINT NOT NULL,
    "ReviewStatus" "ReviewStatus" NOT NULL DEFAULT 'Pending',
    "FromStatus" "VerificationStatus",
    "ToStatus" "VerificationStatus" NOT NULL,
    "Reason" VARCHAR(1000),
    "ReviewerUserID" BIGINT NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SellerVerificationReviews_pkey" PRIMARY KEY ("SellerVerificationReviewID")
);

CREATE TABLE "SellerVerificationHistories" (
    "SellerVerificationHistoryID" BIGSERIAL NOT NULL,
    "SellerVerificationProfileID" BIGINT NOT NULL,
    "FromStatus" "VerificationStatus",
    "ToStatus" "VerificationStatus" NOT NULL,
    "Reason" VARCHAR(1000),
    "ChangedByUserID" BIGINT NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SellerVerificationHistories_pkey" PRIMARY KEY ("SellerVerificationHistoryID")
);

CREATE UNIQUE INDEX "SellerVerificationProfiles_ShopID_key" ON "SellerVerificationProfiles"("ShopID");
CREATE UNIQUE INDEX "SellerVerificationProfiles_IdentityNumberHash_key" ON "SellerVerificationProfiles"("IdentityNumberHash");
CREATE UNIQUE INDEX "SellerVerificationProfiles_TaxCodeHash_key" ON "SellerVerificationProfiles"("TaxCodeHash");
CREATE UNIQUE INDEX "SellerVerificationProfiles_BusinessRegistrationNumberHash_key" ON "SellerVerificationProfiles"("BusinessRegistrationNumberHash");
CREATE INDEX "SellerVerificationProfiles_VerificationStatus_CreatedAt_idx" ON "SellerVerificationProfiles"("VerificationStatus", "CreatedAt");
CREATE INDEX "SellerVerificationProfiles_ReviewedByUserID_idx" ON "SellerVerificationProfiles"("ReviewedByUserID");

CREATE UNIQUE INDEX "SellerPayoutAccounts_ShopID_key" ON "SellerPayoutAccounts"("ShopID");
CREATE INDEX "SellerPayoutAccounts_AccountNumberHash_idx" ON "SellerPayoutAccounts"("AccountNumberHash");
CREATE INDEX "SellerPayoutAccounts_PayoutStatus_idx" ON "SellerPayoutAccounts"("PayoutStatus");
CREATE INDEX "SellerPayoutAccounts_VerifiedByUserID_idx" ON "SellerPayoutAccounts"("VerifiedByUserID");

CREATE UNIQUE INDEX "SellerVerificationDocuments_StoragePublicID_key" ON "SellerVerificationDocuments"("StoragePublicID");
CREATE INDEX "SellerVerificationDocuments_SellerVerificationProfileID_DocumentType_idx" ON "SellerVerificationDocuments"("SellerVerificationProfileID", "DocumentType");
CREATE INDEX "SellerVerificationDocuments_UploadedByUserID_idx" ON "SellerVerificationDocuments"("UploadedByUserID");

CREATE INDEX "SellerVerificationReviews_SellerVerificationProfileID_CreatedAt_idx" ON "SellerVerificationReviews"("SellerVerificationProfileID", "CreatedAt");
CREATE INDEX "SellerVerificationReviews_ReviewStatus_idx" ON "SellerVerificationReviews"("ReviewStatus");
CREATE INDEX "SellerVerificationReviews_ReviewerUserID_idx" ON "SellerVerificationReviews"("ReviewerUserID");
CREATE INDEX "SellerVerificationHistories_SellerVerificationProfileID_CreatedAt_idx" ON "SellerVerificationHistories"("SellerVerificationProfileID", "CreatedAt");
CREATE INDEX "SellerVerificationHistories_ChangedByUserID_idx" ON "SellerVerificationHistories"("ChangedByUserID");

ALTER TABLE "SellerVerificationProfiles"
ADD CONSTRAINT "SellerVerificationProfiles_ShopID_fkey"
FOREIGN KEY ("ShopID") REFERENCES "Shops"("ShopID") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "SellerVerificationProfiles"
ADD CONSTRAINT "SellerVerificationProfiles_ReviewedByUserID_fkey"
FOREIGN KEY ("ReviewedByUserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "SellerPayoutAccounts"
ADD CONSTRAINT "SellerPayoutAccounts_ShopID_fkey"
FOREIGN KEY ("ShopID") REFERENCES "Shops"("ShopID") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "SellerPayoutAccounts"
ADD CONSTRAINT "SellerPayoutAccounts_VerifiedByUserID_fkey"
FOREIGN KEY ("VerifiedByUserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "SellerVerificationDocuments"
ADD CONSTRAINT "SellerVerificationDocuments_SellerVerificationProfileID_fkey"
FOREIGN KEY ("SellerVerificationProfileID") REFERENCES "SellerVerificationProfiles"("SellerVerificationProfileID") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "SellerVerificationDocuments"
ADD CONSTRAINT "SellerVerificationDocuments_UploadedByUserID_fkey"
FOREIGN KEY ("UploadedByUserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "SellerVerificationReviews"
ADD CONSTRAINT "SellerVerificationReviews_SellerVerificationProfileID_fkey"
FOREIGN KEY ("SellerVerificationProfileID") REFERENCES "SellerVerificationProfiles"("SellerVerificationProfileID") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "SellerVerificationReviews"
ADD CONSTRAINT "SellerVerificationReviews_ReviewerUserID_fkey"
FOREIGN KEY ("ReviewerUserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "SellerVerificationHistories"
ADD CONSTRAINT "SellerVerificationHistories_SellerVerificationProfileID_fkey"
FOREIGN KEY ("SellerVerificationProfileID") REFERENCES "SellerVerificationProfiles"("SellerVerificationProfileID") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "SellerVerificationHistories"
ADD CONSTRAINT "SellerVerificationHistories_ChangedByUserID_fkey"
FOREIGN KEY ("ChangedByUserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;

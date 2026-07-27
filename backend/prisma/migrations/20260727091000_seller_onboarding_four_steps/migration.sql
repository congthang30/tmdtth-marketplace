ALTER TYPE "SellerDocumentType" ADD VALUE IF NOT EXISTS 'FaceVerification';

ALTER TABLE "SellerVerificationProfiles"
  ALTER COLUMN "TaxCodeEncrypted" DROP NOT NULL,
  ALTER COLUMN "TaxCodeHash" DROP NOT NULL,
  ALTER COLUMN "TaxCodeLast4" DROP NOT NULL,
  ADD COLUMN "DateOfBirth" DATE,
  ADD COLUMN "ContactName" VARCHAR(100),
  ADD COLUMN "ContactEmail" VARCHAR(255),
  ADD COLUMN "ContactEmailVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "ContactPhone" VARCHAR(20),
  ADD COLUMN "UseAccountPhone" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "FaceVerified" BOOLEAN NOT NULL DEFAULT false;

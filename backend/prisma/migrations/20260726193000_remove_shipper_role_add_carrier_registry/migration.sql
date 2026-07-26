-- Migration: Remove the internal "shipper" model (ShippingCompany used to be
-- a user-owned entity requiring admin approval) and replace it with a fixed
-- carrier registry backed by real GHN (Giao Hang Nhanh) and GHTK (Giao Hang
-- Tiet Kiem) APIs. There is no AppRole.Shipper in the app; this migration
-- removes the de-facto "shipper" ownership model on ShippingCompanies.

-- 1) ShippingCompanies: drop owner/approver columns, add Provider registry key
ALTER TABLE "ShippingCompanies" DROP CONSTRAINT IF EXISTS "ShippingCompanies_OwnerUserID_fkey";
ALTER TABLE "ShippingCompanies" DROP CONSTRAINT IF EXISTS "ShippingCompanies_ApprovedByUserID_fkey";
DROP INDEX IF EXISTS "ShippingCompanies_ownerUserId_idx";

ALTER TABLE "ShippingCompanies" ADD COLUMN "Provider" VARCHAR(20);

-- Backfill Provider for any pre-existing rows so the column can become
-- NOT NULL + UNIQUE; existing demo companies map to a generic 'OTHER' value
-- distinguished by id to avoid unique collisions (they get cleaned up by seed).
UPDATE "ShippingCompanies" SET "Provider" = 'OTHER_' || "ShippingCompanyID"::text WHERE "Provider" IS NULL;

ALTER TABLE "ShippingCompanies" ALTER COLUMN "Provider" SET NOT NULL;
ALTER TABLE "ShippingCompanies" ADD CONSTRAINT "ShippingCompanies_Provider_key" UNIQUE ("Provider");

ALTER TABLE "ShippingCompanies" ALTER COLUMN "CompanyStatus" SET DEFAULT 'Approved';

ALTER TABLE "ShippingCompanies" DROP COLUMN "OwnerUserID";
ALTER TABLE "ShippingCompanies" DROP COLUMN "ApprovedByUserID";
ALTER TABLE "ShippingCompanies" DROP COLUMN "ApprovedAt";

-- 2) ShippingServices: add CarrierServiceCode (the code sent to the carrier
-- API, e.g. GHN service_type_id or GHTK transport type). BaseFee/FeePerKg
-- become informational fallbacks only (real fee now comes from the carrier),
-- so BaseFee gets a default of 0 for future rows.
ALTER TABLE "ShippingServices" ADD COLUMN "CarrierServiceCode" VARCHAR(50);
UPDATE "ShippingServices" SET "CarrierServiceCode" = "ServiceCode" WHERE "CarrierServiceCode" IS NULL;
ALTER TABLE "ShippingServices" ALTER COLUMN "CarrierServiceCode" SET NOT NULL;
ALTER TABLE "ShippingServices" ALTER COLUMN "BaseFee" SET DEFAULT 0;

-- 3) ShippingQuotes: store the raw carrier fee response payload for audit.
ALTER TABLE "ShippingQuotes" ADD COLUMN "CarrierFeeRaw" TEXT;

-- 4) Shipments: store the real carrier order code + carrier-reported status
-- so we can reconcile with GHN/GHTK tracking (webhook or manual sync).
ALTER TABLE "Shipments" ADD COLUMN "CarrierOrderCode" VARCHAR(100);
ALTER TABLE "Shipments" ADD COLUMN "CarrierStatus" VARCHAR(50);

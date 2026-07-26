-- Migration: Vietnam's Quận/Huyện (district) administrative tier was
-- abolished nationwide effective 1 July 2025; the country now uses a
-- 2-tier model (Tỉnh/Thành phố -> Phường/Xã directly). This migration
-- removes the now-obsolete "district" columns from Addresses, Shops,
-- Orders and ShippingQuotes.
--
-- To avoid silently discarding previously entered district information,
-- we first append the old district value into the free-text street
-- address column for every row where it is still present, so the detail
-- the user originally typed remains visible (just no longer split into
-- its own column). Only after that do we drop the columns.

-- 1) Addresses.District -> merge into Addresses.StreetAddress
UPDATE "Addresses"
SET "StreetAddress" = "StreetAddress" || ', ' || "District"
WHERE "District" IS NOT NULL AND btrim("District") <> '';

ALTER TABLE "Addresses" DROP COLUMN "District";

-- 2) Shops.District -> merge into Shops.StreetAddress (nullable on both sides)
UPDATE "Shops"
SET "StreetAddress" = COALESCE("StreetAddress", '') || ', ' || "District"
WHERE "District" IS NOT NULL AND btrim("District") <> '';

ALTER TABLE "Shops" DROP COLUMN "District";

-- 3) Orders.ShippingDistrict -> merge into Orders.ShippingStreetAddress
--    (Orders are historical snapshots; preserve the originally captured
--    detail rather than deleting it outright.)
UPDATE "Orders"
SET "ShippingStreetAddress" = "ShippingStreetAddress" || ', ' || "ShippingDistrict"
WHERE "ShippingDistrict" IS NOT NULL AND btrim("ShippingDistrict") <> '';

ALTER TABLE "Orders" DROP COLUMN "ShippingDistrict";

-- 4) ShippingQuotes.DestinationDistrict -> drop only (never influenced fee
--    calculation, purely informational metadata on a short-lived quote).
ALTER TABLE "ShippingQuotes" DROP COLUMN "DestinationDistrict";

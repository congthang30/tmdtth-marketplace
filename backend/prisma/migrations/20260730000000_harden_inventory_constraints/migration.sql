-- Phase 5 inventory hardening: preserve before-values, reconcile legacy drift, then validate additive constraints.
CREATE TABLE IF NOT EXISTS "ProductInventoryConstraintAudit" (
  "ProductInventoryID" BIGINT PRIMARY KEY,
  "QuantityOnHandBefore" INTEGER NOT NULL,
  "QuantityAvailableBefore" INTEGER NOT NULL,
  "QuantityReservedBefore" INTEGER NOT NULL,
  "QuantityDamagedBefore" INTEGER NOT NULL,
  "ReconciledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductInventoryConstraintAudit_ProductInventoryID_fkey"
    FOREIGN KEY ("ProductInventoryID") REFERENCES "ProductInventory"("ProductInventoryID")
    ON DELETE NO ACTION ON UPDATE NO ACTION
);

INSERT INTO "ProductInventoryConstraintAudit" (
  "ProductInventoryID",
  "QuantityOnHandBefore",
  "QuantityAvailableBefore",
  "QuantityReservedBefore",
  "QuantityDamagedBefore"
)
SELECT
  "ProductInventoryID",
  "QuantityOnHand",
  "QuantityAvailable",
  "QuantityReserved",
  "QuantityDamaged"
FROM "ProductInventory"
WHERE "QuantityAvailable" < 0
   OR "QuantityReserved" < 0
   OR "QuantityDamaged" < 0
   OR "QuantityOnHand" <> "QuantityAvailable" + "QuantityReserved" + "QuantityDamaged"
ON CONFLICT ("ProductInventoryID") DO NOTHING;

UPDATE "ProductInventory"
SET
  "QuantityAvailable" = GREATEST("QuantityAvailable", 0),
  "QuantityReserved" = GREATEST("QuantityReserved", 0),
  "QuantityDamaged" = GREATEST("QuantityDamaged", 0),
  "QuantityOnHand" = GREATEST("QuantityAvailable", 0)
    + GREATEST("QuantityReserved", 0)
    + GREATEST("QuantityDamaged", 0),
  "UpdatedAt" = CURRENT_TIMESTAMP
WHERE "QuantityAvailable" < 0
   OR "QuantityReserved" < 0
   OR "QuantityDamaged" < 0
   OR "QuantityOnHand" <> "QuantityAvailable" + "QuantityReserved" + "QuantityDamaged";

ALTER TABLE "ProductInventory"
  ADD CONSTRAINT "ProductInventory_available_non_negative_v2_check"
    CHECK ("QuantityAvailable" >= 0) NOT VALID,
  ADD CONSTRAINT "ProductInventory_reserved_non_negative_v2_check"
    CHECK ("QuantityReserved" >= 0) NOT VALID,
  ADD CONSTRAINT "ProductInventory_damaged_non_negative_v2_check"
    CHECK ("QuantityDamaged" >= 0) NOT VALID,
  ADD CONSTRAINT "ProductInventory_stock_balance_v2_check"
    CHECK ("QuantityOnHand" = "QuantityAvailable" + "QuantityReserved" + "QuantityDamaged") NOT VALID;

ALTER TABLE "ProductInventory"
  VALIDATE CONSTRAINT "ProductInventory_available_non_negative_v2_check";
ALTER TABLE "ProductInventory"
  VALIDATE CONSTRAINT "ProductInventory_reserved_non_negative_v2_check";
ALTER TABLE "ProductInventory"
  VALIDATE CONSTRAINT "ProductInventory_damaged_non_negative_v2_check";
ALTER TABLE "ProductInventory"
  VALIDATE CONSTRAINT "ProductInventory_stock_balance_v2_check";

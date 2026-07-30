-- CreateEnum
CREATE TYPE "SellerLedgerEntryType" AS ENUM (
  'SaleCredit',
  'PlatformVoucherCredit',
  'PlatformFeeDebit',
  'AdjustmentCredit',
  'AdjustmentDebit',
  'PayoutDebit'
);

-- CreateEnum
CREATE TYPE "SellerLedgerSourceType" AS ENUM (
  'ShopOrder',
  'Payout',
  'Adjustment'
);

-- CreateTable
CREATE TABLE "SellerLedgerEntries" (
  "SellerLedgerEntryID" BIGSERIAL NOT NULL,
  "ShopID" BIGINT NOT NULL,
  "ShopOrderID" BIGINT,
  "EntryType" "SellerLedgerEntryType" NOT NULL,
  "SourceType" "SellerLedgerSourceType" NOT NULL,
  "SourceID" VARCHAR(100) NOT NULL,
  "Amount" DECIMAL(18,2) NOT NULL,
  "Description" VARCHAR(500) NOT NULL,
  "Metadata" JSONB,
  "AvailableAt" TIMESTAMP(3) NOT NULL,
  "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SellerLedgerEntries_pkey" PRIMARY KEY ("SellerLedgerEntryID"),
  CONSTRAINT "SellerLedgerEntries_amount_nonzero_check" CHECK ("Amount" <> 0),
  CONSTRAINT "SellerLedgerEntries_source_id_nonempty_check" CHECK (length(btrim("SourceID")) > 0),
  CONSTRAINT "SellerLedgerEntries_shop_order_source_check" CHECK (
    ("SourceType" = 'ShopOrder' AND "ShopOrderID" IS NOT NULL)
    OR "SourceType" <> 'ShopOrder'
  )
);

-- CreateIndex
CREATE UNIQUE INDEX "SellerLedgerEntries_SourceType_SourceID_EntryType_key"
ON "SellerLedgerEntries"("SourceType", "SourceID", "EntryType");

-- CreateIndex
CREATE INDEX "SellerLedgerEntries_ShopID_AvailableAt_CreatedAt_idx"
ON "SellerLedgerEntries"("ShopID", "AvailableAt", "CreatedAt");

-- CreateIndex
CREATE INDEX "SellerLedgerEntries_ShopOrderID_idx"
ON "SellerLedgerEntries"("ShopOrderID");

-- CreateIndex
CREATE INDEX "SellerLedgerEntries_EntryType_CreatedAt_idx"
ON "SellerLedgerEntries"("EntryType", "CreatedAt");

-- AddForeignKey
ALTER TABLE "SellerLedgerEntries"
ADD CONSTRAINT "SellerLedgerEntries_ShopID_fkey"
FOREIGN KEY ("ShopID") REFERENCES "Shops"("ShopID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SellerLedgerEntries"
ADD CONSTRAINT "SellerLedgerEntries_ShopOrderID_fkey"
FOREIGN KEY ("ShopOrderID") REFERENCES "ShopOrders"("ShopOrderID") ON DELETE NO ACTION ON UPDATE NO ACTION;

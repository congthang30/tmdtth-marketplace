-- CreateEnum
CREATE TYPE "SellerPayoutAccountStatus" AS ENUM ('Active', 'Disabled');
CREATE TYPE "SellerPayoutStatus" AS ENUM (
  'PendingApproval',
  'Approved',
  'Processing',
  'Paid',
  'Rejected',
  'Failed',
  'Cancelled'
);
CREATE TYPE "BankTransactionMatchStatus" AS ENUM (
  'Unmatched',
  'Matched',
  'AmountMismatch',
  'InvalidDirection',
  'IntegrityConflict'
);

-- CreateTable
CREATE TABLE "SellerPayoutAccounts" (
  "SellerPayoutAccountID" BIGSERIAL NOT NULL,
  "ShopID" BIGINT NOT NULL,
  "BankCode" VARCHAR(30) NOT NULL,
  "BankName" VARCHAR(200) NOT NULL,
  "AccountNumberEncrypted" TEXT NOT NULL,
  "AccountNumberHash" VARCHAR(64) NOT NULL,
  "AccountNumberLast4" VARCHAR(4) NOT NULL,
  "AccountHolderName" VARCHAR(200) NOT NULL,
  "Status" "SellerPayoutAccountStatus" NOT NULL DEFAULT 'Active',
  "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "UpdatedAt" TIMESTAMP(3),
  CONSTRAINT "SellerPayoutAccounts_pkey" PRIMARY KEY ("SellerPayoutAccountID"),
  CONSTRAINT "SellerPayoutAccounts_last4_check" CHECK (length("AccountNumberLast4") BETWEEN 1 AND 4)
);

CREATE TABLE "SellerPayouts" (
  "SellerPayoutID" BIGSERIAL NOT NULL,
  "ShopID" BIGINT NOT NULL,
  "PayoutCode" VARCHAR(60) NOT NULL,
  "Amount" DECIMAL(18,2) NOT NULL,
  "Status" "SellerPayoutStatus" NOT NULL DEFAULT 'PendingApproval',
  "BankCodeSnapshot" VARCHAR(30) NOT NULL,
  "BankNameSnapshot" VARCHAR(200) NOT NULL,
  "AccountNumberEncryptedSnapshot" TEXT NOT NULL,
  "AccountNumberHashSnapshot" VARCHAR(64) NOT NULL,
  "AccountNumberLast4Snapshot" VARCHAR(4) NOT NULL,
  "AccountHolderNameSnapshot" VARCHAR(200) NOT NULL,
  "RequestedByUserID" BIGINT NOT NULL,
  "ApprovedByUserID" BIGINT,
  "ProcessedByUserID" BIGINT,
  "RejectedByUserID" BIGINT,
  "RequestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ApprovedAt" TIMESTAMP(3),
  "ProcessingAt" TIMESTAMP(3),
  "PaidAt" TIMESTAMP(3),
  "RejectedAt" TIMESTAMP(3),
  "FailedAt" TIMESTAMP(3),
  "CancelledAt" TIMESTAMP(3),
  "BankReference" VARCHAR(150),
  "Note" VARCHAR(1000),
  "RejectionReason" VARCHAR(1000),
  "FailureReason" VARCHAR(1000),
  "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "UpdatedAt" TIMESTAMP(3),
  CONSTRAINT "SellerPayouts_pkey" PRIMARY KEY ("SellerPayoutID")
);

ALTER TABLE "SellerPayouts"
  ADD CONSTRAINT "SellerPayouts_amount_minimum_check"
    CHECK ("Amount" >= 100000),
  ADD CONSTRAINT "SellerPayouts_code_format_check"
    CHECK ("PayoutCode" ~ '^PAY-[A-Z0-9]+(-[A-Z0-9]+)*$'),
  ADD CONSTRAINT "SellerPayouts_last4_check"
    CHECK (length("AccountNumberLast4Snapshot") BETWEEN 1 AND 4),
  ADD CONSTRAINT "SellerPayouts_status_timestamp_check"
    CHECK (
      ("Status" <> 'Approved' OR "ApprovedAt" IS NOT NULL)
      AND ("Status" <> 'Processing' OR "ProcessingAt" IS NOT NULL)
      AND ("Status" <> 'Paid' OR "PaidAt" IS NOT NULL)
      AND ("Status" <> 'Rejected' OR ("RejectedAt" IS NOT NULL AND length(btrim("RejectionReason")) > 0))
      AND ("Status" <> 'Failed' OR ("FailedAt" IS NOT NULL AND length(btrim("FailureReason")) > 0))
      AND ("Status" <> 'Cancelled' OR "CancelledAt" IS NOT NULL)
    ),
  ADD CONSTRAINT "SellerPayouts_terminal_exclusive_check"
    CHECK (num_nonnulls("PaidAt", "RejectedAt", "FailedAt", "CancelledAt") <= 1);

CREATE TABLE "BankTransactions" (
  "BankTransactionID" BIGSERIAL NOT NULL,
  "Provider" VARCHAR(30) NOT NULL,
  "ProviderTransactionID" VARCHAR(100) NOT NULL,
  "SellerPayoutID" BIGINT,
  "ShopID" BIGINT,
  "Gateway" VARCHAR(50) NOT NULL,
  "AccountNumberMasked" VARCHAR(100) NOT NULL,
  "TransferType" VARCHAR(10) NOT NULL,
  "TransferAmount" DECIMAL(18,2) NOT NULL,
  "TransactionDate" TIMESTAMP(3) NOT NULL,
  "Code" VARCHAR(100),
  "Content" VARCHAR(1000),
  "ReferenceCode" VARCHAR(150),
  "MatchStatus" "BankTransactionMatchStatus" NOT NULL DEFAULT 'Unmatched',
  "PayloadHash" VARCHAR(64) NOT NULL,
  "PayloadMasked" JSONB NOT NULL,
  "MatchedAt" TIMESTAMP(3),
  "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BankTransactions_pkey" PRIMARY KEY ("BankTransactionID"),
  CONSTRAINT "BankTransactions_amount_positive_check" CHECK ("TransferAmount" > 0),
  CONSTRAINT "BankTransactions_direction_check" CHECK ("TransferType" IN ('in', 'out'))
);

CREATE TABLE "FinanceAuditLogs" (
  "FinanceAuditLogID" BIGSERIAL NOT NULL,
  "ShopID" BIGINT,
  "SellerPayoutID" BIGINT,
  "BankTransactionID" BIGINT,
  "ActorUserID" BIGINT,
  "ActorRole" VARCHAR(30) NOT NULL,
  "Action" VARCHAR(80) NOT NULL,
  "FromStatus" VARCHAR(50),
  "ToStatus" VARCHAR(50),
  "Reason" VARCHAR(1000),
  "Metadata" JSONB,
  "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinanceAuditLogs_pkey" PRIMARY KEY ("FinanceAuditLogID")
);

ALTER TABLE "BankTransactions"
ADD CONSTRAINT "BankTransactions_match_consistency_check" CHECK (
  (
    "MatchStatus" = 'Matched'
    AND "SellerPayoutID" IS NOT NULL
    AND "ShopID" IS NOT NULL
    AND "MatchedAt" IS NOT NULL
  )
  OR "MatchStatus" = 'IntegrityConflict'
  OR (
    "MatchStatus" IN ('Unmatched', 'AmountMismatch', 'InvalidDirection')
    AND "SellerPayoutID" IS NULL
    AND "MatchedAt" IS NULL
  )
);

CREATE OR REPLACE FUNCTION "FinanceAuditLogs_prevent_mutation"()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'FinanceAuditLogs are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "FinanceAuditLogs_no_update_delete"
BEFORE UPDATE OR DELETE ON "FinanceAuditLogs"
FOR EACH ROW EXECUTE FUNCTION "FinanceAuditLogs_prevent_mutation"();

-- AlterTable
ALTER TABLE "SellerLedgerEntries" ADD COLUMN "SellerPayoutID" BIGINT;
ALTER TABLE "SellerLedgerEntries"
ADD CONSTRAINT "SellerLedgerEntries_payout_source_check" CHECK (
  ("SourceType" = 'Payout' AND "SellerPayoutID" IS NOT NULL)
  OR "SourceType" <> 'Payout'
);

-- CreateIndex
CREATE UNIQUE INDEX "SellerPayoutAccounts_ShopID_key" ON "SellerPayoutAccounts"("ShopID");
CREATE INDEX "SellerPayoutAccounts_AccountNumberHash_idx" ON "SellerPayoutAccounts"("AccountNumberHash");
CREATE INDEX "SellerPayoutAccounts_Status_idx" ON "SellerPayoutAccounts"("Status");
CREATE UNIQUE INDEX "SellerPayouts_PayoutCode_key" ON "SellerPayouts"("PayoutCode");
CREATE INDEX "SellerPayouts_ShopID_Status_CreatedAt_idx" ON "SellerPayouts"("ShopID", "Status", "CreatedAt");
CREATE INDEX "SellerPayouts_Status_RequestedAt_idx" ON "SellerPayouts"("Status", "RequestedAt");
CREATE INDEX "SellerPayouts_BankReference_idx" ON "SellerPayouts"("BankReference");
CREATE UNIQUE INDEX "BankTransactions_SellerPayoutID_key" ON "BankTransactions"("SellerPayoutID");
CREATE UNIQUE INDEX "BankTransactions_Provider_ProviderTransactionID_key" ON "BankTransactions"("Provider", "ProviderTransactionID");
CREATE INDEX "BankTransactions_MatchStatus_CreatedAt_idx" ON "BankTransactions"("MatchStatus", "CreatedAt");
CREATE INDEX "BankTransactions_Code_TransferAmount_idx" ON "BankTransactions"("Code", "TransferAmount");
CREATE INDEX "BankTransactions_ShopID_CreatedAt_idx" ON "BankTransactions"("ShopID", "CreatedAt");
CREATE INDEX "FinanceAuditLogs_ShopID_CreatedAt_idx" ON "FinanceAuditLogs"("ShopID", "CreatedAt");
CREATE INDEX "FinanceAuditLogs_SellerPayoutID_CreatedAt_idx" ON "FinanceAuditLogs"("SellerPayoutID", "CreatedAt");
CREATE INDEX "FinanceAuditLogs_BankTransactionID_CreatedAt_idx" ON "FinanceAuditLogs"("BankTransactionID", "CreatedAt");
CREATE INDEX "FinanceAuditLogs_ActorUserID_idx" ON "FinanceAuditLogs"("ActorUserID");
CREATE INDEX "SellerLedgerEntries_SellerPayoutID_idx" ON "SellerLedgerEntries"("SellerPayoutID");

-- AddForeignKey
ALTER TABLE "SellerPayoutAccounts" ADD CONSTRAINT "SellerPayoutAccounts_ShopID_fkey" FOREIGN KEY ("ShopID") REFERENCES "Shops"("ShopID") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "SellerPayouts" ADD CONSTRAINT "SellerPayouts_ShopID_fkey" FOREIGN KEY ("ShopID") REFERENCES "Shops"("ShopID") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "SellerPayouts" ADD CONSTRAINT "SellerPayouts_RequestedByUserID_fkey" FOREIGN KEY ("RequestedByUserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "SellerPayouts" ADD CONSTRAINT "SellerPayouts_ApprovedByUserID_fkey" FOREIGN KEY ("ApprovedByUserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "SellerPayouts" ADD CONSTRAINT "SellerPayouts_ProcessedByUserID_fkey" FOREIGN KEY ("ProcessedByUserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "SellerPayouts" ADD CONSTRAINT "SellerPayouts_RejectedByUserID_fkey" FOREIGN KEY ("RejectedByUserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "BankTransactions" ADD CONSTRAINT "BankTransactions_SellerPayoutID_fkey" FOREIGN KEY ("SellerPayoutID") REFERENCES "SellerPayouts"("SellerPayoutID") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "BankTransactions" ADD CONSTRAINT "BankTransactions_ShopID_fkey" FOREIGN KEY ("ShopID") REFERENCES "Shops"("ShopID") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "FinanceAuditLogs" ADD CONSTRAINT "FinanceAuditLogs_ShopID_fkey" FOREIGN KEY ("ShopID") REFERENCES "Shops"("ShopID") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "FinanceAuditLogs" ADD CONSTRAINT "FinanceAuditLogs_SellerPayoutID_fkey" FOREIGN KEY ("SellerPayoutID") REFERENCES "SellerPayouts"("SellerPayoutID") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "FinanceAuditLogs" ADD CONSTRAINT "FinanceAuditLogs_BankTransactionID_fkey" FOREIGN KEY ("BankTransactionID") REFERENCES "BankTransactions"("BankTransactionID") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "FinanceAuditLogs" ADD CONSTRAINT "FinanceAuditLogs_ActorUserID_fkey" FOREIGN KEY ("ActorUserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "SellerLedgerEntries" ADD CONSTRAINT "SellerLedgerEntries_SellerPayoutID_fkey" FOREIGN KEY ("SellerPayoutID") REFERENCES "SellerPayouts"("SellerPayoutID") ON DELETE NO ACTION ON UPDATE NO ACTION;

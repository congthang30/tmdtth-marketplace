-- Extend vouchers with discount target and optional category eligibility.
ALTER TABLE "Vouchers"
  ADD COLUMN "DiscountTarget" VARCHAR(50) NOT NULL DEFAULT 'Product';

CREATE TABLE "VoucherCategories" (
  "VoucherID" BIGINT NOT NULL,
  "CategoryID" BIGINT NOT NULL,
  "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VoucherCategories_pkey" PRIMARY KEY ("VoucherID", "CategoryID"),
  CONSTRAINT "VoucherCategories_VoucherID_fkey"
    FOREIGN KEY ("VoucherID") REFERENCES "Vouchers"("VoucherID")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "VoucherCategories_CategoryID_fkey"
    FOREIGN KEY ("CategoryID") REFERENCES "Categories"("CategoryID")
    ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE INDEX "VoucherCategories_CategoryID_idx"
  ON "VoucherCategories"("CategoryID");

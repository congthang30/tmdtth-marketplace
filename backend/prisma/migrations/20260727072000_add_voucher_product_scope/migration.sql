ALTER TABLE "Vouchers"
  ADD COLUMN "ProductScope" VARCHAR(50) NOT NULL DEFAULT 'AllProducts';

CREATE TABLE "VoucherProducts" (
  "VoucherID" BIGINT NOT NULL,
  "ProductID" BIGINT NOT NULL,
  "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VoucherProducts_pkey" PRIMARY KEY ("VoucherID", "ProductID"),
  CONSTRAINT "VoucherProducts_VoucherID_fkey"
    FOREIGN KEY ("VoucherID") REFERENCES "Vouchers"("VoucherID")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "VoucherProducts_ProductID_fkey"
    FOREIGN KEY ("ProductID") REFERENCES "Products"("ProductID")
    ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE INDEX "VoucherProducts_ProductID_idx" ON "VoucherProducts"("ProductID");

-- ProductVariant.Attributes is now the only variant classification source.
UPDATE "ProductVariants"
SET "Attributes" = '{}'::jsonb
WHERE "Attributes" IS NULL OR jsonb_typeof("Attributes") <> 'object';

ALTER TABLE "ProductVariants"
  ALTER COLUMN "Attributes" SET DEFAULT '{}'::jsonb,
  ALTER COLUMN "Attributes" SET NOT NULL;

DROP TABLE "ProductAttributeValues";
DROP TABLE "ProductAttributes";

ALTER TABLE "ProductVariants"
  DROP COLUMN "VariantOptionJson";

CREATE UNIQUE INDEX "ProductVariants_ProductID_Attributes_key"
ON "ProductVariants"("ProductID", "Attributes");
